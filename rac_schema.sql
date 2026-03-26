-- RAC Engine Database Schema
-- Author: Antigravity (AI Senior Architect)
-- Date: 2026-01-29
-- Description: Core schema for Retrieval-Augmented Contracts (RAC) Engine.
--              Includes versioning, audit trails, and modular clause structures.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1️⃣ TABLE: clause_types
-- Clasificación lógica de cláusulas
CREATE TABLE clause_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,              -- e.g., 'confidencialidad', 'objeto', 'precio'
  name text NOT NULL,                     -- e.g., 'Confidencialidad'
  description text,
  order_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2️⃣ TABLE: clauses
-- Entidad canónica de cláusula (1 cláusula = 1 intención jurídica)
CREATE TABLE clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,               -- e.g., 'CL_CONF_MUTUAL'
  clause_type_id uuid NOT NULL REFERENCES clause_types(id),
  jurisdiction text NOT NULL,              -- e.g., 'MX', 'ES', 'INT'
  language text NOT NULL DEFAULT 'es',     -- 'es', 'en'
  risk_level text NOT NULL,                -- 'neutral', 'protectionist_provider', 'protectionist_client'
  selection_priority integer NOT NULL DEFAULT 100, -- lower number = preferred variant
  description text,                        -- Internal use description
  status text NOT NULL DEFAULT 'active',   -- 'active', 'deprecated'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster retrieval by type
CREATE INDEX idx_clauses_type ON clauses(clause_type_id);

-- 3️⃣ TABLE: clause_versions
-- Aquí vive el texto legal, versionado y auditable.
CREATE TABLE clause_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id uuid NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  version text NOT NULL,                   -- e.g., '1.0.0'
  content_template text NOT NULL,          -- Text with {{variables}}
  change_type text NOT NULL,               -- 'major', 'minor', 'patch'
  is_active boolean NOT NULL DEFAULT true,
  created_by text,                         -- 'legal_ops', 'admin'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clause_id, version)
);

-- Index for retrieving specific clause versions
CREATE INDEX idx_clause_versions_clause_id ON clause_versions(clause_id);
-- Ensure only one active version per clause? 
-- The prompt implies multiple versions exist, but implies a logic for "active".
-- We'll stick to the table structure which allows 'is_active' flag.

-- 4️⃣ TABLE: clause_rules
-- Reglas deterministas, no lenguaje natural.
CREATE TABLE clause_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_id uuid NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  rule_type text NOT NULL,                 -- 'requires', 'excludes', 'mutex', 'trigger'
  rule_definition jsonb NOT NULL,          -- Logic evaluable rules
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clause_rules_clause_id ON clause_rules(clause_id);

-- 5️⃣ TABLE: contract_blueprints
-- Define cómo se arma un tipo de contrato.
CREATE TABLE contract_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,               -- e.g., 'services_standard'
  name text NOT NULL,                      -- e.g., 'Prestación de Servicios'
  jurisdiction text NOT NULL,              -- e.g., 'MX'
  default_clause_order text[] NOT NULL,    -- e.g., ['definiciones', 'objeto', ...]
  mandatory_clause_types text[] NOT NULL,  -- e.g., ['objeto', 'contraprestacion']
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6️⃣ TABLE: blueprint_clauses
-- Explicit mapping to avoid mixing clauses between contract types.
CREATE TABLE blueprint_clauses (
  blueprint_id uuid NOT NULL REFERENCES contract_blueprints(id) ON DELETE CASCADE,
  clause_id uuid NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blueprint_id, clause_id)
);

CREATE INDEX idx_blueprint_clauses_blueprint_id ON blueprint_clauses(blueprint_id);
CREATE INDEX idx_blueprint_clauses_clause_id ON blueprint_clauses(clause_id);

-- 7️⃣ TABLE: blueprint_release_gates
-- Legal approval gate before a blueprint can be used in diagnosis.
CREATE TABLE blueprint_release_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL UNIQUE REFERENCES contract_blueprints(id) ON DELETE CASCADE,
  approval_status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by text,
  approved_at timestamptz,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blueprint_release_status ON blueprint_release_gates(approval_status);

-- 8️⃣ TABLE: contract_generations
-- Registro auditable de cada contrato generado (Traceability)
CREATE TABLE contract_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES contract_blueprints(id),
  input_payload jsonb NOT NULL,            -- Validated user input
  diagnosis_output jsonb NOT NULL,         -- Output from Reasoning Core
  selected_clauses jsonb NOT NULL,         -- JSON array of selected {id, version}
  model_info jsonb NOT NULL,               -- { model: 'gpt-4', temperature: 0, seed: 123 }
  status text NOT NULL,                    -- 'draft', 'halted', 'rejected', 'ready_for_drafting', 'draft_generated', 'drafting_error', 'finalized', 'failed'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_generations_blueprint ON contract_generations(blueprint_id);

-- 9️⃣ TABLE: contract_outputs
-- Storage for generated documents
CREATE TABLE contract_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES contract_generations(id) ON DELETE CASCADE,
  format text NOT NULL,                    -- 'docx', 'pdf'
  storage_path text NOT NULL,              -- storage path reference
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_outputs_generation ON contract_outputs(generation_id);
