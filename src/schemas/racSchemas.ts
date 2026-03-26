import { z } from 'zod';
import { MX_INTENT_CODES } from '../config/contractCatalog';

// --- Shared Enums ---

export const JurisdictionEnum = z.enum(['MX', 'CO', 'US-DE']);
export const LanguageEnum = z.enum(['es', 'en']);
export const DiagnosisStatusEnum = z.enum(['READY', 'MISSING_INFO', 'UNCERTAIN_INTENT', 'POLICY_VIOLATION']);
export const IntentCodeEnum = z.enum(MX_INTENT_CODES);
export const RiskAppetiteEnum = z.enum(['neutral', 'protectionist_provider', 'protectionist_client']);

// --- 1. USER INPUT SCHEMA (API Request) ---

export const DiagnoseInputSchema = z.object({
  user_request: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  context: z.object({
    jurisdiction: JurisdictionEnum.optional().default('MX'),
    user_role: z.enum(['lawyer', 'sales', 'procurement']).default('lawyer'),
    known_variables: z.record(z.string(), z.unknown()).optional(), // Opcional: datos que ya sabemos (ej. nombre cliente)
  }).optional(),
  options: z.object({
    model_tier: z.enum(['standard', 'reasoning_high']).default('standard'), // Para elegir gpt-4 vs gpt-3.5
  }).optional()
});

export type DiagnoseInput = z.infer<typeof DiagnoseInputSchema>;

// --- 2. REASONING CORE OUTPUT SCHEMA (Strict Contract) ---

// --- 3. PROEMIO STRUCTURE ---

export const PartySchema = z.object({
  legal_name: z.string(),
  party_type: z.enum(['persona_moral', 'persona_fisica']).default('persona_moral'), // Default for safety
  short_name: z.string().optional(),
  role_label: z.string(),          // "Proveedor", "Cliente", etc.
  acting_capacity: z.enum(["por_propio_derecho", "representado"]),
  represented_by: z.string().nullable().optional(),
  group_alias: z.string().nullable().optional(),        // Ej. "Grupo NUBA"
  group_members: z.array(z.string()).nullable().optional()     // Lista de sociedades
});

export const ProemioSchema = z.object({
  contract_title: z.string(),
  contract_alias: z.string(), // "Contrato", "Convenio"
  execution_date: z.object({
    day: z.number().nullable(),
    month: z.string().nullable(),
    year: z.number().nullable()
  }),
  parties: z.array(PartySchema)
});

export const DiagnosisOutputSchema = z.object({
  meta: z.object({
    reasoning_model: z.string(),
    timestamp: z.string(),
    trace_id: z.string(),
  }),
  classification: z.object({
    intent_code: IntentCodeEnum,
    jurisdiction: JurisdictionEnum,
    language: LanguageEnum,
    risk_appetite: RiskAppetiteEnum,
  }),
  logic_flags: z.object({
    has_exclusivity: z.boolean().default(false),
    has_ip_transfer: z.boolean().default(false),
    has_confidentiality: z.boolean().default(false),
    has_client_cooperation_required: z.boolean().default(false),
    includes_sla: z.boolean().default(false),
    requires_advance_payment: z.boolean().default(false),
    dispute_resolution_arbitration: z.boolean().default(false),
    contract_specific_flags: z.record(z.string(), z.unknown()).default({}),
  }).strict(),

  // New First-Class Section: Proemio (Structured)
  proemio: ProemioSchema.nullable().optional(),

  // --- 4. DECLARATIONS STRUCTURE ---
  declarations: z.object({
    heading: z.string(), // "DECLARACIONES"
    sections: z.array(z.object({
      roman_index: z.string(), // I, II, III
      declaring_party_ref: z.string().optional(), // Match party.legal_name or id
      intro_text: z.string(), // "Declara el Proveedor, ..."
      items: z.array(z.string()) // "Que es una sociedad..."
    }))
  }).nullable().optional(),

  // Free-form dict populated by AI using the exact placeholder keys found in the contract's templates.
  // e.g. { "domicilio del Vendedor": "Av. Insurgentes 123", "RFC del Vendedor": "XAXX010101000" }
  contract_specific_variables: z.record(z.string(), z.unknown()).optional().default({}),

  variables: z.object({
    // parties: z.object({...}) -> DEPRECATED in favor of proemio.parties
    // We keep basic flat vars for backward compatibility in templates if needed, but Proemio is primary.
    parties: z.object({
      provider_name: z.string().nullable(),
      client_name: z.string().nullable(),
      effective_date: z.string().nullable(),
    }).nullable().optional(),
    commercial_terms: z.object({
      amount: z.number().nullable(),
      currency: z.enum(['MXN', 'USD', 'EUR']).nullable(),
      payment_term_days: z.number().nullable(),
    }),
    service_terms: z.object({
      service_description: z.string().nullable(),
      deliverables_description: z.string().nullable(),
      delivery_timeline: z.string().nullable(),
    }),
    client_obligations: z.object({
      client_cooperation_items: z.string().nullable(),
    }),
    term_terms: z.object({
      contract_duration_months: z.number().nullable(),
      termination_notice_days: z.number().nullable(),
    }),
    payment_terms: z.object({
      payment_method: z.string().nullable(),
    }),
  }),
  status: DiagnosisStatusEnum,
  document_structure: z.array(z.string()).default([
    "proemio",
    "declaraciones",
    "clausulado_principal",
    "clausulado_general",
    "firmas"
  ]),
  missing_info_request: z.array(z.string()).nullable().optional(),
  risk_assessment: z.string().nullable().optional(),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;
