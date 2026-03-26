import { OpenAI } from 'openai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
    DiagnosisOutputSchema,
    DiagnosisOutput,
    DiagnoseInput
} from '../schemas/racSchemas';
import {
    CONTRACT_CATALOG_VERSION,
    MX_CONTRACT_CATALOG,
    MX_INTENT_CODE_SET,
    inferIntentFromText
} from '../config/contractCatalog';

// --- SYSTEM PROMPT CONFIGURATION ---
// This is "Code", not just a string. It changes versioning.
const SYSTEM_PROMPT_V1 = `
You are the Reasoning Core of a RAC (Retrieval-Augmented Contracts) engine.
Your goal is to TRANSLATE user intent into a structured JSON diagnosis.
You DO NOT draft text. You DO NOT invent clauses.

RULES:
1. Analyze the USER_REQUEST and classify it into one of the allowed 'intent_code'.
2. If the request is for an illegal purpose or out of scope, set 'status' to 'POLICY_VIOLATION'.
3. If critical information (like 'amount' or 'service_description') is missing, set 'status' to 'MISSING_INFO'.
4. Set 'logic_flags' based on specific keywords/intent in the request.

5. EXTRACT 'proemio' DATA (Structure of the Preamble):
   - contract_title: Standard title (e.g. "CONTRATO DE PRESTACIÓN DE SERVICIOS").
   - contract_alias: Typically "el Contrato" or "el Convenio".
   - execution_date: Extract day, month, year if present (integers).
   - parties: Array of objects. For each party:
     - legal_name: Full legal name.
     - role_label: "Proveedor", "Cliente", "Arrendador", etc. (Must match what is typical for the intent).
     - party_type: "persona_moral" (companies/organizations) or "persona_fisica" (individuals).
     - acting_capacity: "por_propio_derecho" (individuals) or "representado" (companies).
     - represented_by: Name of signer/rep if mentioned.
     - group_alias: If multiple entities form a group (e.g. "Grupo NUBA").

6. EXTRACT CONTRACT VARIABLES (Business Terms):
   - variables.commercial_terms: amount, currency, payment terms.
   - variables.service_terms: service_description (CRITICAL), deliverables.
   - variables.client_obligations: cooperation items.
   - variables.term_terms: duration months, notice days.
   - variables.payment_terms: payment method.
   
7. If a variable is not mentioned, set it to null.

8. EXTRACT DECLARATIONS (Structured):
   - declarations.heading: "DECLARACIONES"
   - declarations.sections: Array of sections, one for each party or group.
     - roman_index: "I", "II", "III" corresponding to order.
     - declaring_party_ref: Exactly match one of the 'parties.legal_name' (or group alias) extracted in Proemio.
     - intro_text: E.g. "Declara 'EL PROVEEDOR'..." or "Declara 'LA EMPRESA' por conducto de su representante..."
     - items: Array of declaration strings.
       - For Companies: 1. Existence ("Que es una sociedad mercantil..."), 2. Representative powers, 3. Business purpose, 4. Tax ID (RFC), 5. Address.
       - For Individuals: 1. Nationality/Age ("Que es una persona física..."), 2. Tax ID, 3. Address.
       - For Both: "Que cuenta con la capacidad..."
 
9. Output MUST be valid JSON matching the schema provided.

CONTEXT:
Jurisdiction is STRICTLY limited to the one provided in input (default MX).
`;

export class AiReasoningService {
    private openai: OpenAI; // Assume initialized client

    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    /**
     * Orchestrates the reasoning process:
     * 1. Constructs prompt (optionally with per-intent variable hints from DB)
     * 2. Calls LLM
     * 3. Validates & Repairs JSON
     *
     * @param variableHintsByIntent  Map of intent_code -> unique placeholder names
     *                               found in that blueprint's clause templates (from DB).
     *                               Used to instruct the AI to fill `contract_specific_variables`.
     */
    async diagnoseContract(
        input: DiagnoseInput,
        traceId: string,
        variableHintsByIntent?: Record<string, string[]>
    ): Promise<DiagnosisOutput> {

        // Build the variable-hints section to inject into the prompt
        let variableHintsSection = '';
        if (variableHintsByIntent && Object.keys(variableHintsByIntent).length > 0) {
            variableHintsSection = `
CONTRACT-SPECIFIC VARIABLES (MANDATORY - read carefully):
For each intent_code below, the clause templates stored in the database contain EXACTLY THESE placeholder names.
You MUST extract values for all of them from the user request and return them in the "contract_specific_variables" field.
Use the EXACT placeholder name as the key (including spaces and accents).
If a value is not mentioned, use null for that key.

${Object.entries(variableHintsByIntent).map(([code, hints]) =>
    `  ${code}:\n${hints.map(h => `    - "${h}"`).join('\n')}`
).join('\n\n')}

EXAMPLE output for contract_specific_variables:
{
  "contract_specific_variables": {
    "nombre del Vendedor": "Autos Delta SA de CV",
    "RFC del Vendedor": "ADL123456ABC",
    "domicilio del Vendedor": "Av. Insurgentes Sur 1234, CDMX"
  }
}
`;
        }

        // 1. Prepare Payload for AI
        // We inject the Schema definition into the prompt to ensure adherence
        const systemPromptWithSchema = `${SYSTEM_PROMPT_V1}
    
    ACTIVE CATALOG (MX):
    ${JSON.stringify(MX_CONTRACT_CATALOG, null, 2)}
    Catalog version: ${CONTRACT_CATALOG_VERSION}
    ${variableHintsSection}
    REQUIRED OUTPUT SCHEMA:
    ${JSON.stringify(DiagnosisOutputSchema.shape, null, 2)} 
    (Note: This is a simplified representation, ensure strict JSON compliance)`;

        try {
            // 2. Call AI Model (Temperature 0 is non-negotiable)
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-turbo", // Use a model capable of complex reasoning
                messages: [
                    { role: "system", content: systemPromptWithSchema },
                    { role: "user", content: `CONTEXT: ${JSON.stringify(input.context)}\n\nUSER_REQUEST: ${input.user_request}` }
                ],
                temperature: 0,
                response_format: { type: "json_object" }, // Enforce JSON mode
                seed: 42 // Attempt deterministic behavior
            });

            const rawContent = completion.choices[0].message.content;
            console.log("[AiReasoningService] RAW AI RESPONSE:", rawContent); // DEBUG

            if (!rawContent) {
                throw new Error("AI returned empty content");
            }

            // 3. Parse JSON
            let parsedJson: any;
            try {
                parsedJson = JSON.parse(rawContent);
            } catch (e) {
                throw new Error("AI response was not valid JSON");
            }

            // 4. Enrich Metadata (System controlled, not AI controlled)
            parsedJson.meta = {
                reasoning_model: "gpt-4-turbo",
                timestamp: new Date().toISOString(),
                trace_id: traceId
            };
            parsedJson.classification = this.normalizeClassification(parsedJson.classification, input.user_request);
            parsedJson.logic_flags = this.normalizeLogicFlags(parsedJson.logic_flags);
            parsedJson.proemio = this.normalizeProemio(parsedJson.proemio);
            parsedJson.variables = this.normalizeVariables(parsedJson.variables);
            parsedJson.contract_specific_variables = this.normalizeContractSpecificVariables(parsedJson.contract_specific_variables);
            parsedJson.document_structure = this.normalizeDocumentStructure(parsedJson.document_structure);
            parsedJson.missing_info_request = this.normalizeMissingInfoRequest(parsedJson.missing_info_request);

            // 5. Strict Schema Validation (The Firewall)
            // If this fails, the AI output is rejected fundamental
            const validatedOutput = DiagnosisOutputSchema.parse(parsedJson);

            // 6. Business Logic Sanity Checks (Post-AI Validation)
            // Example: AI cannot set risk_appetite to 'protectionist_provider' if context was 'procurement' (conflict of interest logic, maybe?)
            // For now, we trust strict schema, but this is where extra rules go.

            return validatedOutput;

        } catch (error: any) {
            // Error Handling strategy:
            // If Validation failed, we might want to retry (self-correction) or fail hard.
            // For this MVP, we fail hard.
            console.error(`[ReasoningService] Error trace_id=${traceId}:`, error);

            if (error instanceof z.ZodError) {
                throw new Error(`AI Output Validation Failed: ${JSON.stringify((error as any).errors)}`);
            }
            throw error;
        }
    }

    private normalizeClassification(classification: any, userRequest: string) {
        const safeClassification = { ...(classification || {}) };
        const inferred = inferIntentFromText(userRequest);
        const defaultIntent = MX_CONTRACT_CATALOG[0]?.intent_code || 'services_enterprise_exclusive_mx';

        if (!safeClassification.intent_code || !MX_INTENT_CODE_SET.has(safeClassification.intent_code)) {
            safeClassification.intent_code = inferred || defaultIntent;
        }

        if (!safeClassification.jurisdiction) {
            safeClassification.jurisdiction = 'MX';
        }
        if (!safeClassification.language) {
            safeClassification.language = 'es';
        }
        if (!safeClassification.risk_appetite) {
            safeClassification.risk_appetite = 'neutral';
        }

        return safeClassification;
    }

    private normalizeLogicFlags(logicFlags: any) {
        const safeFlags = { ...(logicFlags || {}) };
        if (!safeFlags.contract_specific_flags || typeof safeFlags.contract_specific_flags !== 'object') {
            safeFlags.contract_specific_flags = {};
        }
        return safeFlags;
    }

    private normalizeVariables(variables: any) {
        const safeVariables = variables || {};
        return {
            parties: safeVariables.parties ?? {
                provider_name: null,
                client_name: null,
                effective_date: null
            },
            commercial_terms: safeVariables.commercial_terms ?? {
                amount: null,
                currency: null,
                payment_term_days: null
            },
            service_terms: safeVariables.service_terms ?? {
                service_description: null,
                deliverables_description: null,
                delivery_timeline: null
            },
            client_obligations: safeVariables.client_obligations ?? {
                client_cooperation_items: null
            },
            term_terms: safeVariables.term_terms ?? {
                contract_duration_months: null,
                termination_notice_days: null
            },
            payment_terms: safeVariables.payment_terms ?? {
                payment_method: null
            }
        };
    }

    private normalizeProemio(proemio: any) {
        if (!proemio) return proemio;
        const safeProemio = { ...proemio };
        if (!safeProemio.execution_date || typeof safeProemio.execution_date !== 'object') {
            safeProemio.execution_date = {
                day: null,
                month: null,
                year: null
            };
        }
        if (!Array.isArray(safeProemio.parties)) {
            safeProemio.parties = [];
        }
        return safeProemio;
    }

    private normalizeContractSpecificVariables(csv: any): Record<string, unknown> {
        if (!csv || typeof csv !== 'object' || Array.isArray(csv)) return {};
        // Drop any values that are not primitive-safe (only keep string/number/boolean/null)
        const safe: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(csv)) {
            if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                safe[k] = v;
            }
        }
        return safe;
    }

    private normalizeDocumentStructure(documentStructure: any): string[] {
        const fallback = ["proemio", "declaraciones", "clausulado_principal", "clausulado_general", "firmas"];

        if (Array.isArray(documentStructure)) {
            return documentStructure.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        }

        // Some model responses wrap array in an object shape like { defaultValue: [...] }.
        if (documentStructure && typeof documentStructure === 'object' && Array.isArray(documentStructure.defaultValue)) {
            return documentStructure.defaultValue.filter(
                (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0
            );
        }

        return fallback;
    }

    private normalizeMissingInfoRequest(missingInfoRequest: any): string[] | null | undefined {
        if (missingInfoRequest === undefined) return undefined;
        if (missingInfoRequest === null) return null;
        if (!Array.isArray(missingInfoRequest)) return null;
        return missingInfoRequest.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
}
