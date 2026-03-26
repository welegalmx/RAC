import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';
import { DiagnosisOutput } from '../schemas/racSchemas';
import { enrichVariablesWithMoneyFormatting, sanitizeResolvedContractText } from '../utils/legalMoney';

interface ClauseContentRow {
    version_id: string;
    content_template: string;
    clause_name: string; // From clause_types.name or clauses.code
}

export class DraftingService {

    // Directory where drafts are stored locally
    private readonly STORAGE_DIR = path.resolve(__dirname, '../../outputs');

    constructor() {
        // Ensure storage directory exists
        if (!fs.existsSync(this.STORAGE_DIR)) {
            fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
        }
    }

    /**
     * Assembles the final contract text by substituting variables into selected clause templates.
     * @param generationId 
     */
    async generateDraftForGeneration(generationId: string) {
        console.log(`[DraftingService] Starting drafting for generation=${generationId}`);

        try {
            // 1. Fetch Context & Validate Status
            const generation = await this.fetchGenerationContext(generationId);

            if (generation.status !== 'ready_for_drafting') {
                throw new Error(`Generation is not ready for drafting. Current status: ${generation.status}`);
            }

            const selectedClauses = generation.selected_clauses;
            if (!selectedClauses || selectedClauses.length === 0) {
                throw new Error("No clauses selected for drafting.");
            }

            // Parse if it's a string (from DB it comes as JSON string)
            const parsedClauses = typeof selectedClauses === 'string'
                ? JSON.parse(selectedClauses)
                : selectedClauses;

            // Map 'version' field to 'version_id' for compatibility
            const normalizedClauses = parsedClauses.map((c: any) => ({
                ...c,
                version_id: c.version || c.version_id
            }));

            // 2. Fetch Clause Content
            // We need the templates for the specific versions selected
            // We also fetch names for headers if needed
            const versionIds = normalizedClauses.map((c: any) => c.version_id);
            console.log('[DraftingService] Normalized clauses:', JSON.stringify(normalizedClauses.slice(0, 2), null, 2));
            console.log('[DraftingService] Version IDs:', versionIds);
            const contentMap = await this.fetchClauseContents(versionIds);

            // 3. Prepare Variables
            console.log('[DraftingService] Raw diagnosis variables:', JSON.stringify(generation.diagnosis_output.variables, null, 2));

            const variablesObj = { ...generation.diagnosis_output.variables };

            // Backfill specific legacy variables from Proemio Structure if present
            // This ensures clauses like {{parties.provider_name}} still work even if AI put data in proemio.parties
            if (generation.diagnosis_output.proemio) {
                const proemio = generation.diagnosis_output.proemio;

                if (proemio.parties) {
                    const provider = proemio.parties.find((p: any) => p.role_label.toLowerCase().includes('proveedor') || p.role_label.toLowerCase().includes('vendedor'));
                    const client = proemio.parties.find((p: any) => p.role_label.toLowerCase().includes('cliente') || p.role_label.toLowerCase().includes('comprador'));

                    if (!variablesObj.parties) variablesObj.parties = {};
                    if (provider) variablesObj.parties.provider_name = provider.legal_name;
                    if (client) variablesObj.parties.client_name = client.legal_name;
                }

                if (proemio.execution_date) {
                    if (!variablesObj.parties) variablesObj.parties = {};
                    variablesObj.parties.effective_date = `${proemio.execution_date.year}-${proemio.execution_date.month}-${proemio.execution_date.day}`;
                }
            }

            const flattenedParams = this.flattenVariables(variablesObj);
            let variables = this.addLegacyAliases(flattenedParams);

            // Merge contract_specific_variables (exact placeholder keys from DB templates).
            // These come pre-filled by the AI using the hints fed at diagnosis time.
            const contractSpecificVars = generation.diagnosis_output.contract_specific_variables;
            if (contractSpecificVars && typeof contractSpecificVars === 'object') {
                for (const [k, v] of Object.entries(contractSpecificVars)) {
                    if (v !== null && v !== undefined) {
                        variables[k] = String(v);
                    }
                }
            }

            const strVars: Record<string, string> = {};
            for (const [k, v] of Object.entries(variables)) {
                if (v !== null && v !== undefined) strVars[k] = String(v);
            }
            Object.assign(variables, enrichVariablesWithMoneyFormatting(strVars, generation.diagnosis_output));

            console.log('[DraftingService] Flattened variables (with aliases):', JSON.stringify(variables, null, 2));

            // 4. Clean Validation of Variables vs Placeholders
            // We do this pass before drafting to ensure strict correctness
            // (Skipped for performance in this MVP, we do it inline)

            // 5. Assemble Document
            let fullDraftText = `CONTRACT DRAFT\nID: ${generationId}\nDATE: ${new Date().toISOString()}\n\n`;
            fullDraftText += `========================================\n\n`;

            for (const item of normalizedClauses) {
                const templateData = contentMap.get(item.version_id);
                if (!templateData) {
                    throw new Error(`Content not found for version ${item.version_id}`);
                }

                // Add Title/Header (Simulated styling)
                fullDraftText += `### ${item.code} ###\n`;

                // Replace Variables
                const populatedText = this.replacePlaceholders(templateData.content_template, variables);

                fullDraftText += populatedText + "\n\n";
            }

            // 6. Persist Output (File System + DB Registry)
            const fileName = `draft_${generationId}.txt`;
            const filePath = path.join(this.STORAGE_DIR, fileName);

            fs.writeFileSync(filePath, fullDraftText, 'utf-8');
            console.log(`[DraftingService] Written draft to ${filePath}`);

            const outputId = await this.persistOutputRecord(generationId, filePath);

            // 7. Update Generation Status
            await pool.query(
                `UPDATE contract_generations SET status = 'draft_generated' WHERE id = $1`,
                [generationId]
            );

            return {
                success: true,
                generation_id: generationId,
                output_id: outputId,
                draft_text: fullDraftText
            };

        } catch (error: any) {
            console.error(`[DraftingService] Error:`, error);

            // If error is related to missing variables, we might want to flag it
            if (error.message.includes('Missing value')) {
                await pool.query(
                    `UPDATE contract_generations SET status = 'drafting_error' WHERE id = $1`,
                    [generationId]
                );
            }

            throw error;
        }
    }

    private async fetchGenerationContext(generationId: string) {
        const res = await pool.query(
            `SELECT id, diagnosis_output, selected_clauses, status 
             FROM contract_generations 
             WHERE id = $1`,
            [generationId]
        );

        if (res.rows.length === 0) throw new Error("Generation not found");
        return res.rows[0];
    }

    private async fetchClauseContents(versionIds: string[]): Promise<Map<string, ClauseContentRow>> {
        if (versionIds.length === 0) return new Map();

        // Parameterized query for array of IDs
        const query = `
            SELECT 
                cv.id as version_id,
                cv.content_template,
                c.code as clause_code
            FROM clause_versions cv
            JOIN clauses c ON cv.clause_id = c.clause_id
            WHERE cv.id = ANY($1::uuid[])
        `;

        // Note: 'clauses c ON cv.clause_id = c.clause_id' might be wrong if 'c.id' is the PK.
        // Let's check schema: 'clauses.id' is PK. 'clause_versions.clause_id' references 'clauses.id'.
        const fixedQuery = `
            SELECT 
                cv.id as version_id,
                cv.content_template,
                c.code as clause_name
            FROM clause_versions cv
            JOIN clauses c ON cv.clause_id = c.id
            WHERE cv.id = ANY($1::uuid[])
        `;

        const res = await pool.query(fixedQuery, [versionIds]);

        const map = new Map<string, ClauseContentRow>();
        res.rows.forEach(row => {
            map.set(row.version_id, row);
        });
        return map;
    }

    private flattenVariables(variablesObj: any, parentKey = ''): Record<string, any> {
        let flattened: Record<string, any> = {};

        for (const key in variablesObj) {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;

            if (typeof variablesObj[key] === 'object' && variablesObj[key] !== null && !Array.isArray(variablesObj[key])) {
                // Recursively flatten nested objects
                const nested = this.flattenVariables(variablesObj[key], fullKey);
                flattened = { ...flattened, ...nested };
            } else {
                // Store with dot notation key
                flattened[fullKey] = variablesObj[key];
            }
        }
        return flattened;
    }

    /**
     * Legacy Compatibility:
     * Some older templates might use {{service_description}} instead of {{service_terms.service_description}}.
     * We auto-expose leaf properties at the root if they don't conflict.
     */
    private addLegacyAliases(variables: Record<string, any>): Record<string, any> {
        const enriched = { ...variables };

        // Explicit mappings for V0 -> V1 migration
        const mappings: Record<string, string> = {
            'service_terms.service_description': 'service_description',
            'service_terms.deliverables_description': 'deliverables_description',
            'service_terms.delivery_timeline': 'delivery_timeline',
            'client_obligations.client_cooperation_items': 'client_cooperation_items',
            'payment_terms.payment_method': 'payment_method',
            'term_terms.contract_duration_months': 'contract_duration_months',
            'term_terms.termination_notice_days': 'termination_notice_days'
        };

        for (const [newPath, oldPath] of Object.entries(mappings)) {
            if (variables[newPath] !== undefined && enriched[oldPath] === undefined) {
                enriched[oldPath] = variables[newPath];
            }
        }
        return enriched;
    }

    private resolveVariable(variables: Record<string, any>, keyRaw: string): unknown {
        const key = keyRaw.trim();
        if (Object.prototype.hasOwnProperty.call(variables, key)) return variables[key];
        const lower = key.toLowerCase();
        for (const [k, v] of Object.entries(variables)) {
            if (String(k).toLowerCase() === lower) return v;
        }
        return undefined;
    }

    private replacePlaceholders(template: string, variables: Record<string, any>): string {
        let t = String(template).replace(/\\n/g, '\n');
        let result = t.replace(/\{\{([^}]+)\}\}/g, (_match, variableName) => {
            const key = variableName.trim();
            const value = this.resolveVariable(variables, key);

            if (value === undefined || value === null) {
                console.warn(`[DraftingService] Missing placeholder value for key="${key}", using fallback.`);
                return 'N/D';
            }
            return String(value);
        });

        result = result.replace(/\{([^{}]+)\}/g, (_match, variableName) => {
            const key = variableName.trim();
            const value = this.resolveVariable(variables, key);

            if (value === undefined || value === null) {
                console.warn(`[DraftingService] Missing single-brace placeholder value for key="${key}", using fallback.`);
                return 'N/D';
            }
            return String(value);
        });

        return sanitizeResolvedContractText(result);
    }

    private async persistOutputRecord(generationId: string, storagePath: string) {
        const res = await pool.query(
            `INSERT INTO contract_outputs (generation_id, format, storage_path)
             VALUES ($1, 'text/plain', $2)
             RETURNING id`,
            [generationId, storagePath]
        );
        return res.rows[0].id;
    }
}
