import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { pool } from '../config/db';
import { DiagnoseInputSchema } from '../schemas/racSchemas';
import { AiReasoningService } from '../services/aiReasoningService';
import { CONTRACT_CATALOG_VERSION } from '../config/contractCatalog';

const reasoningService = new AiReasoningService();

/**
 * Reads all clause_versions content_templates from approved blueprints in DB,
 * extracts unique placeholder names per blueprint code, and returns the map.
 * Result is used to tell the AI exactly which variables to fill per intent.
 */
async function fetchVariableHintsFromDB(): Promise<Record<string, string[]>> {
    try {
        const res = await pool.query<{ blueprint_code: string; content_template: string }>(`
            SELECT DISTINCT b.code AS blueprint_code, cv.content_template
            FROM clause_versions cv
            JOIN clauses c ON cv.clause_id = c.id
            JOIN blueprint_clauses bc ON bc.clause_id = c.id
            JOIN contract_blueprints b ON bc.blueprint_id = b.id
            JOIN blueprint_release_gates g ON g.blueprint_id = b.id
            WHERE g.approval_status = 'approved'
        `);

        const hintsByIntent: Record<string, string[]> = {};

        for (const row of res.rows) {
            const code = row.blueprint_code;
            if (!hintsByIntent[code]) hintsByIntent[code] = [];

            const template = row.content_template || '';
            // Match both {{double braces}} and {single braces} placeholders
            const matches = template.match(/\{+([^{}]+)\}+/g) || [];
            for (const m of matches) {
                const key = m.replace(/^\{+/, '').replace(/\}+$/, '').trim();
                if (key && !hintsByIntent[code].includes(key)) {
                    hintsByIntent[code].push(key);
                }
            }
        }

        console.log(`[DiagnosisController] Variable hints loaded from DB:`, Object.entries(hintsByIntent).map(([k, v]) => `${k}: ${v.length} vars`));
        return hintsByIntent;
    } catch (err) {
        console.warn(`[DiagnosisController] Could not fetch variable hints from DB (non-fatal):`, err);
        return {};
    }
}

export const diagnoseHandler = async (req: Request, res: Response) => {
    const traceId = uuidv4();

    try {
        // 1. Validate Input (Gatekeeper)
        const validatedInput = DiagnoseInputSchema.parse(req.body);
        console.log(`[DiagnosisController] Starting diagnosis trace_id=${traceId}`);

        // 1b. Pre-load variable hints from DB so the AI knows which placeholders to extract
        const variableHintsByIntent = await fetchVariableHintsFromDB();

        // 2. Delegate to Reasoning Core (AI)
        const diagnosisResult = await reasoningService.diagnoseContract(validatedInput, traceId, variableHintsByIntent);

        // 3. Resolve Blueprint (DB Lookup)
        // We must ensure the intent requested by AI matches a valid blueprint in our DB.
        const intentCode = diagnosisResult.classification.intent_code;
        const jurisdiction = diagnosisResult.classification.jurisdiction;

        const blueprintQuery = `
            SELECT b.id
            FROM contract_blueprints b
            JOIN blueprint_release_gates g ON g.blueprint_id = b.id
            WHERE
                b.code = $1
                AND b.jurisdiction = $2
                AND g.approval_status = 'approved'
            LIMIT 1;
        `;

        const blueprintResult = await pool.query(blueprintQuery, [intentCode, jurisdiction]);

        if (blueprintResult.rows.length === 0) {
            console.warn(`[DiagnosisController] Blueprint not found for intent=${intentCode} jur=${jurisdiction}`);
            // If the AI suggests an intent we don't support in DB, we audit it but return error (or handle as 'unsupported').
            // For now, we behave strictly: if blueprint doesn't exist, we cannot generate.
            return res.status(404).json({
                success: false,
                error: "BLUEPRINT_NOT_FOUND",
                details: `No blueprint configured for intent '${intentCode}' in '${jurisdiction}'.`,
                trace_id: traceId
            });
        }

        const blueprintId = blueprintResult.rows[0].id;

        // 4. Map Status to DB Status
        // AI Status: READY, MISSING_INFO, UNCERTAIN_INTENT, POLICY_VIOLATION
        // DB Status: draft, halted, rejected
        let dbStatus = 'draft';
        if (diagnosisResult.status === 'POLICY_VIOLATION') dbStatus = 'rejected';
        else if (diagnosisResult.status !== 'READY') dbStatus = 'halted';

        // 5. Persist Generation Record (Transactional Insert)
        const generationId = uuidv4(); // Generate ID here for logging and insertion
        console.log(`[DiagnosisController] Persisting generation: generation_id=${generationId}, user_request=${JSON.stringify(req.body.user_request)}`);

        const modelInfo = {
            model: diagnosisResult.meta.reasoning_model,
            trace_id: traceId,
            timestamp: diagnosisResult.meta.timestamp,
            catalog_version: CONTRACT_CATALOG_VERSION
        };

        const insertQuery = `
            INSERT INTO contract_generations (
                id,
                blueprint_id,
                input_payload,
                diagnosis_output,
                selected_clauses,
                model_info,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;

        const insertResult = await pool.query(insertQuery, [
            generationId, // $1: id
            blueprintId,  // $2: blueprint_id
            validatedInput, // $3: input_payload (JSONB)
            diagnosisResult, // $4: diagnosis_output (JSONB)
            JSON.stringify([]), // $5: selected_clauses
            modelInfo,    // $6: model_info (JSONB)
            dbStatus      // $7: status
        ]);

        console.log(`[DiagnosisController] Persisted generation_id=${generationId} status=${dbStatus}`);

        console.log(`[DiagnosisController] Persisted generation_id=${generationId} status=${dbStatus}`);

        // 6. Handle Non-Ready Logic for Response
        // If it was a Policy Violation, return 400 even though we saved the audit record.
        if (diagnosisResult.status === 'POLICY_VIOLATION') {
            return res.status(400).json({
                success: false,
                error: "POLICY_VIOLATION",
                trace_id: traceId,
                generation_id: generationId, // Return ID for audit reference
                diagnosis: diagnosisResult
            });
        }

        // Output Success
        return res.status(200).json({
            success: true,
            trace_id: traceId,
            generation_id: generationId,
            diagnosis: diagnosisResult // Frontend uses this to show next steps or missing info form
        });

    } catch (err) {
        // Error Handling
        if (err instanceof ZodError) {
            return res.status(422).json({
                success: false,
                error: "INPUT_VALIDATION_ERROR",
                details: (err as any).errors
            });
        }

        console.error(`[DiagnosisController] Unhandled error trace_id=${traceId}:`, err);
        const fs = require('fs');
        fs.writeFileSync('diagnosis_error.log', `[${new Date().toISOString()}] ${err}\n${(err as any).stack}\n`);

        return res.status(500).json({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
            trace_id: traceId,
            message: "An error occurred during contract diagnosis persistence."
        });
    }
};
