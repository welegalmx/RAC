import { pool } from '../config/db';
import * as XLSX from 'xlsx';
import path from 'path';
import { applyCanonicalClauseOrdering } from './saasBlueprintOrderingPatch';

type SheetRow = {
    blueprint_code: string;
    blueprint_name: string;
    jurisdiction: string;
    clause_type_code: string;
    clause_type_name: string;
    clause_order_index: number;
    clause_code: string;
    clause_title: string;
    risk_level: string;
    selection_priority: number;
    is_mandatory: string | boolean;
    version: string;
    change_type: string;
    is_active: string | boolean;
    content_template: string;
    trigger_flag?: string | null;
    trigger_value?: string | null;
    requires_clause_code?: string | null;
    requires_type_code?: string | null;
    excludes_clause_code?: string | null;
    excludes_type_code?: string | null;
    mutex_clause_code?: string | null;
    mutex_type_code?: string | null;
    legal_approved?: string | boolean | null;
    approved_by?: string | null;
    approval_notes?: string | null;
};

function toBool(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return ['true', '1', 'yes', 'si'].includes(value.trim().toLowerCase());
    return false;
}

function normalizeRiskLevel(riskLevel: string): string {
    const normalized = (riskLevel || '').trim().toLowerCase();
    if (normalized === 'high' || normalized === 'alto') return 'protectionist_provider';
    if (normalized === 'low' || normalized === 'bajo') return 'protectionist_client';
    return 'neutral';
}

function getRules(row: SheetRow) {
    const rules: { rule_type: string; rule_definition: Record<string, unknown> }[] = [];

    if (row.trigger_flag && row.trigger_flag.trim() && row.trigger_flag.trim().toLowerCase() !== 'false') {
        rules.push({
            rule_type: 'trigger',
            rule_definition: { flag: row.trigger_flag.trim(), value: row.trigger_value ?? true }
        });
    }
    if (row.requires_clause_code && row.requires_clause_code.trim()) {
        rules.push({
            rule_type: 'requires',
            rule_definition: { target_clause_code: row.requires_clause_code.trim() }
        });
    }
    if (row.requires_type_code && row.requires_type_code.trim()) {
        rules.push({
            rule_type: 'requires',
            rule_definition: { target_type_code: row.requires_type_code.trim() }
        });
    }
    if (row.excludes_clause_code && row.excludes_clause_code.trim()) {
        rules.push({
            rule_type: 'excludes',
            rule_definition: { target_clause_code: row.excludes_clause_code.trim() }
        });
    }
    if (row.excludes_type_code && row.excludes_type_code.trim()) {
        rules.push({
            rule_type: 'excludes',
            rule_definition: { target_type_code: row.excludes_type_code.trim() }
        });
    }
    if (row.mutex_clause_code && row.mutex_clause_code.trim()) {
        rules.push({
            rule_type: 'mutex',
            rule_definition: { target_clause_code: row.mutex_clause_code.trim() }
        });
    }
    if (row.mutex_type_code && row.mutex_type_code.trim()) {
        rules.push({
            rule_type: 'mutex',
            rule_definition: { target_type_code: row.mutex_type_code.trim() }
        });
    }

    return rules;
}

async function loadSaasClausesSeed() {
    const xlsxPath = path.resolve(__dirname, '../../saas_clauses.xlsx');
    console.log(`Loading Excel seed from: ${xlsxPath}`);

    const workbook = XLSX.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('Workbook has no sheets.');
    }

    const rows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], { defval: null }).filter(
        (row) =>
            row.blueprint_code &&
            row.clause_type_code &&
            row.clause_code &&
            row.jurisdiction &&
            row.content_template
    );

    if (!rows.length) {
        throw new Error('No usable rows found in saas_clauses.xlsx');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(`
            TRUNCATE TABLE
                contract_outputs,
                contract_generations,
                blueprint_release_gates,
                blueprint_clauses,
                contract_blueprints,
                clause_rules,
                clause_versions,
                clauses,
                clause_types
            RESTART IDENTITY CASCADE;
        `);

        const typeMap = new Map<string, { name: string; order_index: number }>();
        for (const row of rows) {
            const existing = typeMap.get(row.clause_type_code);
            if (!existing || row.clause_order_index < existing.order_index) {
                typeMap.set(row.clause_type_code, {
                    name: row.clause_type_name || row.clause_type_code,
                    order_index: Number(row.clause_order_index) || 1000
                });
            }
        }

        const clauseTypeIdByCode = new Map<string, string>();
        for (const [code, data] of typeMap.entries()) {
            const res = await client.query(
                `
                INSERT INTO clause_types (code, name, order_index)
                VALUES ($1, $2, $3)
                RETURNING id;
                `,
                [code, data.name, data.order_index]
            );
            clauseTypeIdByCode.set(code, res.rows[0].id);
        }

        const blueprintMap = new Map<string, { name: string; jurisdiction: string; rows: SheetRow[] }>();
        for (const row of rows) {
            if (!blueprintMap.has(row.blueprint_code)) {
                blueprintMap.set(row.blueprint_code, {
                    name: row.blueprint_name || row.blueprint_code,
                    jurisdiction: row.jurisdiction,
                    rows: []
                });
            }
            blueprintMap.get(row.blueprint_code)!.rows.push(row);
        }

        const blueprintIdByCode = new Map<string, string>();
        for (const [blueprintCode, blueprintData] of blueprintMap.entries()) {
            const sorted = [...blueprintData.rows].sort(
                (a, b) => Number(a.clause_order_index || 0) - Number(b.clause_order_index || 0)
            );
            const defaultClauseOrder = Array.from(new Set(sorted.map((r) => r.clause_type_code)));
            const mandatoryClauseTypes = Array.from(
                new Set(sorted.filter((r) => toBool(r.is_mandatory)).map((r) => r.clause_type_code))
            );

            const bpRes = await client.query(
                `
                INSERT INTO contract_blueprints (code, name, jurisdiction, default_clause_order, mandatory_clause_types)
                VALUES ($1, $2, $3, $4::text[], $5::text[])
                RETURNING id;
                `,
                [blueprintCode, blueprintData.name, blueprintData.jurisdiction, defaultClauseOrder, mandatoryClauseTypes]
            );
            blueprintIdByCode.set(blueprintCode, bpRes.rows[0].id);
        }

        const clauseIdByCode = new Map<string, string>();
        for (const row of rows) {
            if (clauseIdByCode.has(row.clause_code)) continue;
            const clauseTypeId = clauseTypeIdByCode.get(row.clause_type_code);
            if (!clauseTypeId) {
                throw new Error(`Missing clause type id for code: ${row.clause_type_code}`);
            }

            const clauseRes = await client.query(
                `
                INSERT INTO clauses (
                    code, clause_type_id, jurisdiction, language, risk_level, selection_priority, description, status
                )
                VALUES ($1, $2, $3, 'es', $4, $5, $6, 'active')
                RETURNING id;
                `,
                [
                    row.clause_code,
                    clauseTypeId,
                    row.jurisdiction,
                    normalizeRiskLevel(row.risk_level),
                    // Use clause_order_index as the primary ordering key within a blueprint.
                    // selection_priority from the Excel is a secondary quality signal.
                    Number(row.clause_order_index) || Number(row.selection_priority) || 100,
                    row.clause_title || row.clause_code
                ]
            );
            const clauseId = clauseRes.rows[0].id as string;
            clauseIdByCode.set(row.clause_code, clauseId);

            await client.query(
                `
                INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active, created_by)
                VALUES ($1, $2, $3, $4, $5, 'excel_import')
                `,
                [
                    clauseId,
                    row.version || '1.0.0',
                    row.content_template,
                    row.change_type || 'major',
                    toBool(row.is_active) || row.is_active === null
                ]
            );
        }

        for (const row of rows) {
            const blueprintId = blueprintIdByCode.get(row.blueprint_code);
            const clauseId = clauseIdByCode.get(row.clause_code);
            if (!blueprintId || !clauseId) continue;

            await client.query(
                `
                INSERT INTO blueprint_clauses (blueprint_id, clause_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING;
                `,
                [blueprintId, clauseId]
            );
        }

        for (const row of rows) {
            const clauseId = clauseIdByCode.get(row.clause_code);
            if (!clauseId) continue;
            const rules = getRules(row);
            for (const rule of rules) {
                await client.query(
                    `
                    INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
                    VALUES ($1, $2, $3::jsonb);
                    `,
                    [clauseId, rule.rule_type, JSON.stringify(rule.rule_definition)]
                );
            }
        }

        for (const [blueprintCode, blueprintData] of blueprintMap.entries()) {
            const blueprintId = blueprintIdByCode.get(blueprintCode);
            if (!blueprintId) continue;
            const approvedRows = blueprintData.rows.filter((row) => toBool(row.legal_approved));
            const approvedBy = approvedRows.find((row) => row.approved_by)?.approved_by || 'excel_import';
            const notes = approvedRows.find((row) => row.approval_notes)?.approval_notes || 'Imported from saas_clauses.xlsx';
            const approvalStatus = 'approved';
            const approvedAt = 'now()';

            await client.query(
                `
                INSERT INTO blueprint_release_gates (blueprint_id, approval_status, approved_by, approved_at, checklist, notes)
                VALUES (
                    $1,
                    $2,
                    $3,
                    ${approvedAt},
                    $4::jsonb,
                    $5
                );
                `,
                [blueprintId, approvalStatus, approvedBy, JSON.stringify({ source: 'saas_clauses.xlsx' }), notes]
            );
        }

        await applyCanonicalClauseOrdering(client);

        await client.query('COMMIT');

        const stats = await client.query(`
            SELECT
                (SELECT COUNT(*) FROM contract_blueprints) AS blueprints,
                (SELECT COUNT(*) FROM clauses WHERE status = 'active') AS clauses,
                (SELECT COUNT(*) FROM clause_rules) AS rules,
                (SELECT COUNT(*) FROM blueprint_release_gates WHERE approval_status = 'approved') AS approved;
        `);

        const row = stats.rows[0];
        console.log('✅ Excel seed loaded successfully!');
        console.log(`📊 Blueprints activos: ${row.blueprints}`);
        console.log(`📊 Cláusulas activas: ${row.clauses}`);
        console.log(`📊 Reglas: ${row.rules}`);
        console.log(`📊 Blueprints aprobados: ${row.approved}`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

loadSaasClausesSeed()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Excel seed failed:', error);
        process.exit(1);
    });
