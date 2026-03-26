import { pool } from '../config/db';
import { DiagnosisOutput, DiagnosisOutputSchema } from '../schemas/racSchemas';

interface DBGeneration {
    id: string;
    blueprint_id: string;
    diagnosis_output: DiagnosisOutput;
    status: string;
}

interface DBBlueprint {
    id: string;
    code: string;
    jurisdiction: string;
    mandatory_clause_types: string[]; // List of clause_type codes
    default_clause_order: string[];   // List of clause_type codes for sorting
}

interface DBClauseCandidate {
    clause_id: string;
    version_id: string;
    clause_code: string;
    type_code: string;
    selection_priority: number;
    content_template: string;
    rules: DBRule[];
}

interface DBRule {
    rule_type: 'requires' | 'excludes' | 'mutex' | 'trigger';
    rule_definition: {
        flag?: string;       // For trigger
        value?: boolean;     // For trigger
        target_clause_code?: string; // For requires/excludes/mutex
        target_type_code?: string;  // For requires/excludes/mutex
    };
}

export class RetrievalService {

    /**
     * Deterministically selects clauses based on Diagnosis Logic Flags + Blueprint Rules.
     * @param generationId The UUID of the generation to process.
     */
    async getClausesForGeneration(generationId: string) {
        console.log(`[RetrievalService] Starting retrieval for generation=${generationId}`);

        try {
            // 1. Fetch Context (Generation + Blueprint)
            const { generation, blueprint } = await this.fetchContext(generationId);

            // Allow: fresh diagnosis (draft), incomplete diagnosis (halted), or re-run retrieve (ready_for_drafting).
            // Block: policy rejection, pipeline errors, completed draft (must diagnose again for a new id).
            const blockedStatuses = new Set(['rejected', 'failed', 'drafting_error', 'draft_generated']);
            if (blockedStatuses.has(generation.status)) {
                throw new Error(
                    `Generation cannot run retrieve in state: ${generation.status}. ` +
                    `Create a new generation (diagnose) or use a record in draft, halted, or ready_for_drafting.`
                );
            }

            // 2. Fetch candidates scoped to blueprint + jurisdiction.
            const candidates = await this.fetchCandidates(blueprint.id, blueprint.jurisdiction);
            console.log(`[RetrievalService] Found ${candidates.length} active clause candidates for blueprint=${blueprint.code}`);

            // 3. The Retrieval Logic (Filter & Select)
            const selectedClauses = this.applyRetrievalLogic(
                candidates,
                blueprint,
                generation.diagnosis_output.logic_flags
            );

            // 4. Persist Result
            await this.persistSelection(generationId, selectedClauses);

            return {
                success: true,
                generation_id: generationId,
                selected_count: selectedClauses.length,
                selected_clauses: selectedClauses.map(c => ({
                    code: c.clause_code,
                    type: c.type_code,
                    version_id: c.version_id
                }))
            };

        } catch (error: any) {
            console.error(`[RetrievalService] Error:`, error);

            // Keep schema status contract consistent.
            if (error.message.includes('CONFLICT') || error.message.includes('MUTEX')) {
                await pool.query(
                    `UPDATE contract_generations SET status = 'failed' WHERE id = $1`,
                    [generationId]
                );
            }

            throw error;
        }
    }

    private async fetchContext(generationId: string) {
        const query = `
            SELECT 
                g.id as g_id, 
                g.blueprint_id, 
                g.diagnosis_output, 
                g.status,
                b.id as b_id,
                b.code as b_code,
                b.jurisdiction,
                b.mandatory_clause_types,
                b.default_clause_order
            FROM contract_generations g
            JOIN contract_blueprints b ON g.blueprint_id = b.id
            WHERE g.id = $1
        `;

        const res = await pool.query(query, [generationId]);
        if (res.rows.length === 0) throw new Error("Generation or Blueprint not found");

        const row = res.rows[0];

        return {
            generation: {
                id: row.g_id,
                blueprint_id: row.blueprint_id,
                diagnosis_output: row.diagnosis_output as DiagnosisOutput,
                status: row.status
            } as DBGeneration,
            blueprint: {
                id: row.b_id,
                code: row.b_code,
                jurisdiction: row.jurisdiction,
                mandatory_clause_types: row.mandatory_clause_types || [],
                default_clause_order: row.default_clause_order || []
            } as DBBlueprint
        };
    }

    private async fetchCandidates(blueprintId: string, jurisdiction: string): Promise<DBClauseCandidate[]> {
        // Complex query to get Clauses + Active Version + Rule Array
        const query = `
            SELECT 
                c.id as clause_id,
                c.code as clause_code,
                ct.code as type_code,
                c.selection_priority,
                cv.id as version_id,
                cv.content_template,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'rule_type', cr.rule_type, 
                            'rule_definition', cr.rule_definition
                        ) 
                    ) FILTER (WHERE cr.id IS NOT NULL), 
                    '[]'
                ) as rules
            FROM clauses c
            JOIN blueprint_clauses bc ON c.id = bc.clause_id
            JOIN clause_types ct ON c.clause_type_id = ct.id
            JOIN clause_versions cv ON c.id = cv.clause_id
            LEFT JOIN clause_rules cr ON c.id = cr.clause_id
            WHERE 
                bc.blueprint_id = $1
                AND
                c.jurisdiction = $2
                AND c.status = 'active'
                AND cv.is_active = true
            GROUP BY c.id, c.code, ct.code, c.selection_priority, cv.id, cv.content_template;
        `;

        const res = await pool.query(query, [blueprintId, jurisdiction]);
        return res.rows.map(row => ({
            clause_id: row.clause_id,
            version_id: row.version_id,
            clause_code: row.clause_code,
            type_code: row.type_code,
            selection_priority: row.selection_priority ?? 100,
            content_template: row.content_template,
            rules: row.rules
        }));
    }

    private applyRetrievalLogic(
        candidates: DBClauseCandidate[],
        blueprint: DBBlueprint,
        flags: Record<string, unknown>
    ): DBClauseCandidate[] {
        const sortedCandidates = [...candidates].sort((a, b) => this.compareCandidates(a, b, blueprint));
        const candidatesByCode = new Map(sortedCandidates.map(candidate => [candidate.clause_code, candidate]));
        const selectedCodes = new Set<string>();
        const uniqueTypeCount = new Set(sortedCandidates.map(candidate => candidate.type_code)).size;
        const hasRepeatedTypes = uniqueTypeCount < sortedCandidates.length;
        const denseMandatoryByType = blueprint.mandatory_clause_types.length === uniqueTypeCount;
        const fragmentedTemplateMode = hasRepeatedTypes && denseMandatoryByType;

        const pickClauseByType = (typeCode: string) => {
            const preferred = sortedCandidates.find(candidate => candidate.type_code === typeCode);
            if (!preferred) return null;
            selectedCodes.add(preferred.clause_code);
            return preferred;
        };

        // PHASE 1: base selection.
        // - Classic mode: pick one clause per mandatory type.
        // - Fragmented template mode (e.g., spreadsheets with many rows per type):
        //   include all non-trigger clauses as the base contractual body.
        if (fragmentedTemplateMode) {
            for (const candidate of sortedCandidates) {
                const hasTriggerRules = candidate.rules.some(rule => rule.rule_type === 'trigger');
                if (!hasTriggerRules) {
                    selectedCodes.add(candidate.clause_code);
                }
            }
        } else {
            for (const mandatoryType of blueprint.mandatory_clause_types) {
                const chosen = pickClauseByType(mandatoryType);
                if (!chosen) {
                    throw new Error(`CONFLICT_MANDATORY_MISSING: No candidate found for mandatory type ${mandatoryType}.`);
                }
            }
        }

        // PHASE 2: trigger rules.
        for (const candidate of sortedCandidates) {
            const triggerRules = candidate.rules.filter(rule => rule.rule_type === 'trigger');
            for (const rule of triggerRules) {
                const flagName = rule.rule_definition.flag;
                const requiredValue = rule.rule_definition.value;
                if (flagName && typeof flags[flagName] === 'boolean' && flags[flagName] === requiredValue) {
                    selectedCodes.add(candidate.clause_code);
                    break;
                }
            }
        }

        // PHASE 3: requires rules (fixed-point expansion).
        let changed = true;
        while (changed) {
            changed = false;
            const currentlySelected = Array.from(selectedCodes)
                .map(code => candidatesByCode.get(code))
                .filter((candidate): candidate is DBClauseCandidate => Boolean(candidate));

            for (const candidate of currentlySelected) {
                const requiresRules = candidate.rules.filter(rule => rule.rule_type === 'requires');
                for (const rule of requiresRules) {
                    const targetClauseCode = rule.rule_definition.target_clause_code;
                    const targetTypeCode = rule.rule_definition.target_type_code;

                    if (targetClauseCode) {
                        if (!candidatesByCode.has(targetClauseCode)) {
                            throw new Error(`CONFLICT_REQUIRES_MISSING: ${candidate.clause_code} requires missing clause ${targetClauseCode}.`);
                        }
                        if (!selectedCodes.has(targetClauseCode)) {
                            selectedCodes.add(targetClauseCode);
                            changed = true;
                        }
                    }

                    if (targetTypeCode) {
                        const beforeSize = selectedCodes.size;
                        const picked = pickClauseByType(targetTypeCode);
                        if (!picked) {
                            throw new Error(`CONFLICT_REQUIRES_TYPE_MISSING: ${candidate.clause_code} requires type ${targetTypeCode} and no candidate exists.`);
                        }
                        if (selectedCodes.size !== beforeSize) {
                            changed = true;
                        }
                    }
                }
            }
        }

        // PHASE 4: excludes rules.
        const excludedCodes = new Set<string>();
        const excludedTypes = new Set<string>();
        for (const code of selectedCodes) {
            const candidate = candidatesByCode.get(code);
            if (!candidate) continue;
            const excludeRules = candidate.rules.filter(rule => rule.rule_type === 'excludes');
            for (const rule of excludeRules) {
                if (rule.rule_definition.target_clause_code) {
                    excludedCodes.add(rule.rule_definition.target_clause_code);
                }
                if (rule.rule_definition.target_type_code) {
                    excludedTypes.add(rule.rule_definition.target_type_code);
                }
            }
        }

        if (excludedCodes.size > 0 || excludedTypes.size > 0) {
            for (const code of [...selectedCodes]) {
                const candidate = candidatesByCode.get(code);
                if (!candidate) continue;
                if (excludedCodes.has(candidate.clause_code) || excludedTypes.has(candidate.type_code)) {
                    selectedCodes.delete(code);
                }
            }
        }

        // PHASE 5: enforce single clause per type (classic mode only).
        // In fragmented mode, multiple rows intentionally share the same type
        // (e.g., many declaration paragraphs), so we keep all of them.
        if (!fragmentedTemplateMode) {
            const typeBucket = new Map<string, DBClauseCandidate[]>();
            for (const code of selectedCodes) {
                const candidate = candidatesByCode.get(code);
                if (!candidate) continue;
                const bucket = typeBucket.get(candidate.type_code) || [];
                bucket.push(candidate);
                typeBucket.set(candidate.type_code, bucket);
            }

            for (const [typeCode, bucket] of typeBucket.entries()) {
                if (bucket.length <= 1) continue;
                const winner = [...bucket].sort((a, b) => this.compareCandidates(a, b, blueprint))[0];
                for (const entry of bucket) {
                    if (entry.clause_code !== winner.clause_code) {
                        selectedCodes.delete(entry.clause_code);
                    }
                }
                console.log(`[RetrievalLogic] Deduped type=${typeCode}, selected=${winner.clause_code}`);
            }
        }

        // PHASE 6: mutex validation.
        const finalSelection = Array.from(selectedCodes)
            .map(code => candidatesByCode.get(code))
            .filter((candidate): candidate is DBClauseCandidate => Boolean(candidate));

        for (const candidate of finalSelection) {
            const mutexRules = candidate.rules.filter(rule => rule.rule_type === 'mutex');
            for (const rule of mutexRules) {
                const targetCode = rule.rule_definition.target_clause_code;
                const targetType = rule.rule_definition.target_type_code;

                if (targetCode && selectedCodes.has(targetCode)) {
                    throw new Error(`MUTEX_CONFLICT: ${candidate.clause_code} conflicts with ${targetCode}.`);
                }
                if (targetType) {
                    const hasType = finalSelection.some(entry => entry.type_code === targetType);
                    if (hasType) {
                        throw new Error(`MUTEX_CONFLICT: ${candidate.clause_code} conflicts with type ${targetType}.`);
                    }
                }
            }
        }

        // PHASE 7: mandatory validation after exclusions.
        const finalTypes = new Set(finalSelection.map(candidate => candidate.type_code));
        const missingMandatory = blueprint.mandatory_clause_types.filter(type => !finalTypes.has(type));
        if (missingMandatory.length > 0) {
            throw new Error(`CONFLICT_MANDATORY_REMOVED: Missing mandatory types after rule application: ${missingMandatory.join(', ')}`);
        }

        return finalSelection.sort((a, b) => this.compareCandidates(a, b, blueprint));
    }

    private compareCandidates(a: DBClauseCandidate, b: DBClauseCandidate, blueprint: DBBlueprint): number {
        const typeIndexA = blueprint.default_clause_order.indexOf(a.type_code);
        const typeIndexB = blueprint.default_clause_order.indexOf(b.type_code);
        const safeTypeA = typeIndexA === -1 ? 999 : typeIndexA;
        const safeTypeB = typeIndexB === -1 ? 999 : typeIndexB;

        if (safeTypeA !== safeTypeB) {
            return safeTypeA - safeTypeB;
        }
        if (a.selection_priority !== b.selection_priority) {
            return a.selection_priority - b.selection_priority;
        }
        const na = RetrievalService.clauseNumericSuffix(a.clause_code);
        const nb = RetrievalService.clauseNumericSuffix(b.clause_code);
        if (na !== null && nb !== null && na !== nb) {
            return na - nb;
        }
        return a.clause_code.localeCompare(b.clause_code);
    }

    /** Último segmento `_12` en el código de cláusula (p. ej. incisos DECL_*_INM_2 antes que _10 en sort lexicográfico). */
    private static clauseNumericSuffix(code: string): number | null {
        const m = code.match(/_(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
    }

    private async persistSelection(generationId: string, clauses: DBClauseCandidate[]) {
        // Minimal storage: id, version, type
        const storagePayload = clauses.map(c => ({
            id: c.clause_id,
            version: c.version_id,
            code: c.clause_code,
            type: c.type_code
        }));

        const query = `
            UPDATE contract_generations 
            SET 
                selected_clauses = $1,
                status = 'ready_for_drafting' -- intermediate status
            WHERE id = $2
        `;

        await pool.query(query, [JSON.stringify(storagePayload), generationId]);
        console.log(`[RetrievalService] Persisted ${clauses.length} clauses for generation ${generationId}`);
    }
}
