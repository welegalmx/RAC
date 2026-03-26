-- RAC Minimal Seeding Script for E2E Validation
-- Author: Antigravity (AI Senior Backend)
-- Date: 2026-01-29
-- Description: Inserts minimal data to test the 'services_standard' (MX) contract flow.
--              Includes 1 Blueprint, 6 Clause Types, 6 Clauses, and 1 Logical Rule.

BEGIN;

-- 1. CLEANUP (Idempotency)
-- We wipe target tables to ensure clean state for testing. 
-- Order matters due to FK constraints.
TRUNCATE TABLE contract_outputs, contract_generations, clause_rules, blueprint_release_gates, blueprint_clauses, clause_versions, clauses, contract_blueprints, clause_types RESTART IDENTITY CASCADE;

-- 2. CLAUSE TYPES
-- These define the "slots" in the contract structure.
INSERT INTO clause_types (code, name, order_index) VALUES
('definiciones', 'Definiciones', 10),
('objeto', 'Objeto del Contrato', 20),
('contraprestacion', 'Contraprestación y Forma de Pago', 30),
('vigencia', 'Vigencia', 40),
('confidencialidad', 'Confidencialidad', 50), -- Optional slot
('jurisdiccion', 'Jurisdicción y Ley Aplicable', 90);

-- 3. CLAUSES & VERSIONS
-- We insert the Clause entity and its corresponding Version 1.0.0 immediately.
-- Using CTEs to capture IDs for linking.

-- 3.1 DEFINICIONES (Base)
WITH c AS (
    INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority)
    SELECT 'CL_DEF_BASE', id, 'MX', 'es', 'neutral', 100 FROM clause_types WHERE code = 'definiciones'
    RETURNING id
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active)
SELECT id, '1.0.0', 
'CLÁUSULA PRIMERA. DEFINICIONES.
Para efectos del presente Contrato, las partes acuerdan las siguientes definiciones:
"Servicios": Significa los servicios profesionales descritos en la propuesta anexa.
"Cliente": Significa {{parties.client_name}}.
"Proveedor": Significa {{parties.provider_name}}.',
'major', true FROM c;

-- 3.2 OBJETO (Services)
WITH c AS (
    INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority)
    SELECT 'CL_OBJ_SERVICES', id, 'MX', 'es', 'neutral', 100 FROM clause_types WHERE code = 'objeto'
    RETURNING id
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active)
SELECT id, '1.0.0', 
'CLÁUSULA SEGUNDA. OBJETO.
El Proveedor se obliga a prestar al Cliente, de manera independiente y con sus propios recursos, servicios profesionales consistentes en desarrollo y consultoría tecnológica (en adelante, los "Servicios").',
'major', true FROM c;

-- 3.3 CONTRAPRESTACIÓN (Fixed Price)
WITH c AS (
    INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority)
    SELECT 'CL_PRICE_FIXED', id, 'MX', 'es', 'neutral', 100 FROM clause_types WHERE code = 'contraprestacion'
    RETURNING id
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active)
SELECT id, '1.0.0', 
'CLÁUSULA TERCERA. CONTRAPRESTACIÓN.
Como contraprestación por los Servicios, el Cliente pagará al Proveedor la cantidad de {{commercial_terms.amount}} {{commercial_terms.currency}} más el Impuesto al Valor Agregado (IVA) correspondiente.
El pago se realizará dentro de los {{commercial_terms.payment_term_days}} días naturales siguientes a la recepción de la factura correspondiente.',
'major', true FROM c;

-- 3.4 VIGENCIA (Fixed Term)
WITH c AS (
    INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority)
    SELECT 'CL_TERM_FIXED', id, 'MX', 'es', 'neutral', 100 FROM clause_types WHERE code = 'vigencia'
    RETURNING id
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active)
SELECT id, '1.0.0', 
'CLÁUSULA CUARTA. VIGENCIA.
Este Contrato entrará en vigor a partir del {{parties.effective_date}} y tendrá una vigencia indefinida hasta la conclusión de los Servicios, salvo terminación anticipada según lo dispuesto en este instrumento.',
'major', true FROM c;

-- 3.5 CONFIDENCIALIDAD (Optional / Triggered)
-- This clause is NOT mandatory in the blueprint, but triggered by logic.
WITH c AS (
    INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority)
    SELECT 'CL_CONF_MUTUAL', id, 'MX', 'es', 'neutral', 100 FROM clause_types WHERE code = 'confidencialidad'
    RETURNING id
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active)
SELECT id, '1.0.0', 
'CLÁUSULA QUINTA. CONFIDENCIALIDAD.
Ambas Partes acuerdan mantener en estricta confidencialidad toda la Información Confidencial recibida de la otra Parte durante la vigencia de este Contrato y por un periodo de 2 (dos) años posteriores a su terminación.',
'major', true FROM c;

-- 3.6 JURISDICCIÓN (MX)
WITH c AS (
    INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority)
    SELECT 'CL_JUR_MX', id, 'MX', 'es', 'neutral', 100 FROM clause_types WHERE code = 'jurisdiccion'
    RETURNING id
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active)
SELECT id, '1.0.0', 
'CLÁUSULA SEXTA. JURISDICCIÓN.
Para la interpretación y cumplimiento del presente Contrato, las partes se someten expresamente a las leyes y tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.',
'major', true FROM c;

-- 4. BLUEPRINT
-- Defines the structure of "Standard Services Contract" for MX.
INSERT INTO contract_blueprints (code, name, jurisdiction, mandatory_clause_types, default_clause_order)
VALUES (
    'services_standard', 
    'Contrato de Prestación de Servicios Profesionales',
    'MX',
    ARRAY['definiciones','objeto','contraprestacion','vigencia','jurisdiccion'], -- Confidencialidad IS MISSING here (Intentional)
    ARRAY['definiciones','objeto','contraprestacion','vigencia','confidencialidad','jurisdiccion']
);

-- 5. RULES (The "Brain")
-- Rule: If diagnosis says 'has_confidentiality = true', THEN include 'CL_CONF_MUTUAL'.
INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT 
    id, 
    'trigger', 
    '{"flag": "has_confidentiality", "value": true}'::jsonb
FROM clauses WHERE code = 'CL_CONF_MUTUAL';

-- 6. BLUEPRINT-CLAUSE ISOLATION MAP
INSERT INTO blueprint_clauses (blueprint_id, clause_id)
SELECT b.id, c.id
FROM contract_blueprints b
JOIN clauses c ON c.code IN ('CL_DEF_BASE','CL_OBJ_SERVICES','CL_PRICE_FIXED','CL_TERM_FIXED','CL_CONF_MUTUAL','CL_JUR_MX')
WHERE b.code = 'services_standard';

-- 7. LEGAL QA GATE
INSERT INTO blueprint_release_gates (blueprint_id, approval_status, approved_by, approved_at, checklist, notes)
SELECT
    id,
    'approved',
    'legal_team_review',
    now(),
    '{"validacion_juridica": true, "variables_obligatorias": true, "matriz_e2e_aprobada": true}'::jsonb,
    'Aprobacion para flujo minimo E2E'
FROM contract_blueprints
WHERE code = 'services_standard';

COMMIT;

-- VALIDATION QUERY (For manual check)
-- SELECT code FROM clauses WHERE status = 'active';
