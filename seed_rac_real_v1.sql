-- RAC Real Seed v2
-- Catalogo cerrado MX: 15 tipos de contrato empresariales

BEGIN;

TRUNCATE TABLE
  contract_outputs,
  contract_generations,
  clause_rules,
  blueprint_release_gates,
  blueprint_clauses,
  clause_versions,
  clauses,
  contract_blueprints,
  clause_types
RESTART IDENTITY CASCADE;

INSERT INTO clause_types (code, name, order_index) VALUES
('definiciones', 'Definiciones', 10),
('objeto', 'Objeto', 20),
('alcance', 'Alcance', 30),
('contraprestacion', 'Contraprestacion', 40),
('forma_pago', 'Forma de Pago', 50),
('vigencia', 'Vigencia', 60),
('confidencialidad', 'Confidencialidad', 70),
('propiedad_intelectual', 'Propiedad Intelectual', 80),
('datos_personales', 'Tratamiento de Datos Personales', 85),
('sla', 'Niveles de Servicio', 90),
('terminacion', 'Terminacion', 100),
('responsabilidades', 'Responsabilidades', 110),
('no_competencia', 'No Competencia', 115),
('arrendamiento_inmueble', 'Condiciones de Inmueble', 120),
('cumplimiento_laboral', 'Cumplimiento Laboral', 125),
('jurisdiccion', 'Jurisdiccion y Ley Aplicable', 130);

WITH clause_seed(type_code, clause_code, risk_level, selection_priority, content_template) AS (
  VALUES
    ('definiciones', 'CL_DEF_GENERAL_MX', 'neutral', 100, 'CLAUSULA PRIMERA. DEFINICIONES. Para efectos del presente contrato, los terminos definidos en el documento principal y sus anexos tendran el alcance ahi previsto.'),
    ('objeto', 'CL_OBJ_SERVICES_MX', 'neutral', 20, 'CLAUSULA SEGUNDA. OBJETO. El proveedor prestara servicios profesionales especializados para el cliente conforme al alcance pactado.'),
    ('objeto', 'CL_OBJ_NDA_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. Las partes celebran un convenio de confidencialidad para regular el intercambio y resguardo de informacion sensible.'),
    ('objeto', 'CL_OBJ_SAAS_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. El proveedor otorgara acceso al cliente a una plataforma SaaS en modalidad de suscripcion conforme a niveles de servicio definidos.'),
    ('objeto', 'CL_OBJ_LICENSE_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. El titular concede al cliente una licencia de uso de software con los alcances, limites y restricciones establecidos en este instrumento.'),
    ('objeto', 'CL_OBJ_SUPPLY_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. El proveedor suministrara bienes de manera periodica conforme a especificaciones tecnicas y calendario de entrega.'),
    ('objeto', 'CL_OBJ_DISTRIBUTION_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. El distribuidor comercializara los productos en territorio pactado bajo lineamientos de marca, precio y cumplimiento comercial.'),
    ('objeto', 'CL_OBJ_PURCHASE_SALE_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. La parte vendedora transmite la propiedad de bienes o activos y la compradora paga el precio convenido en los terminos del contrato.'),
    ('objeto', 'CL_OBJ_LEASE_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. La parte arrendadora concede el uso y goce temporal del inmueble de destino comercial a la parte arrendataria.'),
    ('objeto', 'CL_OBJ_LOAN_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. La parte mutuante entrega una suma de dinero a la mutuataria con obligacion de restitucion en los plazos y condiciones pactados.'),
    ('objeto', 'CL_OBJ_PARTNERSHIP_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. Las partes coordinan esfuerzos para una colaboracion empresarial, definiendo responsabilidades y metas conjuntas.'),
    ('objeto', 'CL_OBJ_EMPLOYMENT_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. La persona trabajadora se obliga a prestar servicios personales subordinados y la empresa a cubrir salario y prestaciones de ley.'),
    ('objeto', 'CL_OBJ_DATA_PROCESSING_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. Se regula el acceso y tratamiento de datos personales por parte del encargado bajo instrucciones del responsable.'),
    ('objeto', 'CL_OBJ_CONSULTING_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. La consultora brindara servicios de asesoria especializada y recomendaciones ejecutables para el negocio del cliente.'),
    ('objeto', 'CL_OBJ_INDEPENDENT_CONTRACTOR_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. El prestador independiente ejecutara actividades profesionales sin subordinacion laboral y con autonomia tecnica.'),
    ('objeto', 'CL_OBJ_MAINTENANCE_SUPPORT_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. El proveedor brindara mantenimiento preventivo, correctivo y soporte operativo sobre infraestructura o software del cliente.'),
    ('alcance', 'CL_SCOPE_STANDARD_MX', 'neutral', 100, 'CLAUSULA TERCERA. ALCANCE. El alcance tecnico, entregables y exclusiones se documentan en anexos y solo podran modificarse por acuerdo escrito.'),
    ('contraprestacion', 'CL_PRICE_STANDARD_MX', 'neutral', 100, 'CLAUSULA CUARTA. CONTRAPRESTACION. El cliente pagara la contraprestacion acordada en anexos comerciales, mas impuestos aplicables.'),
    ('forma_pago', 'CL_PAYMENT_STANDARD_MX', 'neutral', 100, 'CLAUSULA QUINTA. FORMA DE PAGO. El pago se realizara mediante transferencia o medio pactado, contra comprobante fiscal valido.'),
    ('forma_pago', 'CL_PAYMENT_ADVANCE_MX', 'neutral', 10, 'CLAUSULA QUINTA. FORMA DE PAGO. Se establece un anticipo previo al inicio de obligaciones y el remanente conforme a hitos contractuales.'),
    ('vigencia', 'CL_TERM_STANDARD_MX', 'neutral', 100, 'CLAUSULA SEXTA. VIGENCIA. El contrato entra en vigor en la fecha de firma y permanecera vigente durante el plazo pactado o hasta su terminacion.'),
    ('confidencialidad', 'CL_CONF_STANDARD_MX', 'neutral', 100, 'CLAUSULA SEPTIMA. CONFIDENCIALIDAD. Las partes resguardaran informacion confidencial y limitaran su uso al cumplimiento del contrato.'),
    ('confidencialidad', 'CL_CONF_NDA_STRICT_MX', 'neutral', 10, 'CLAUSULA SEPTIMA. CONFIDENCIALIDAD. La parte receptora aplicara estandares reforzados de custodia, acceso minimo necesario y devolucion segura de informacion.'),
    ('propiedad_intelectual', 'CL_IP_STANDARD_MX', 'neutral', 100, 'CLAUSULA OCTAVA. PROPIEDAD INTELECTUAL. Cada parte conserva titularidad de sus activos preexistentes; los desarrollos derivados se rigen por anexos de titularidad.'),
    ('datos_personales', 'CL_DPA_STANDARD_MX', 'neutral', 100, 'CLAUSULA NOVENA. DATOS PERSONALES. El tratamiento de datos se realizara conforme a la normativa aplicable, medidas de seguridad y deberes de confidencialidad.'),
    ('sla', 'CL_SLA_STANDARD_MX', 'neutral', 100, 'CLAUSULA DECIMA. NIVELES DE SERVICIO. Los niveles de disponibilidad, tiempos de respuesta y escalamiento se establecen en el anexo SLA.'),
    ('terminacion', 'CL_TERMINATION_STANDARD_MX', 'neutral', 100, 'CLAUSULA DECIMA PRIMERA. TERMINACION. Cualquiera de las partes podra terminar anticipadamente por incumplimiento material no subsanado.'),
    ('responsabilidades', 'CL_LIABILITY_STANDARD_MX', 'neutral', 100, 'CLAUSULA DECIMA SEGUNDA. RESPONSABILIDADES. Las partes responderan por danos directos conforme al marco legal y limites contractuales permitidos.'),
    ('no_competencia', 'CL_NONCOMPETE_STANDARD_MX', 'neutral', 100, 'CLAUSULA DECIMA TERCERA. NO COMPETENCIA. Se establecen restricciones razonables de no captacion y no competencia durante la vigencia contractual.'),
    ('arrendamiento_inmueble', 'CL_LEASE_PROPERTY_STANDARD_MX', 'neutral', 100, 'CLAUSULA DECIMA CUARTA. INMUEBLE. El inmueble objeto del arrendamiento se identifica en anexo con condiciones de entrega, uso y conservacion.'),
    ('cumplimiento_laboral', 'CL_LABOR_COMPLIANCE_STANDARD_MX', 'neutral', 100, 'CLAUSULA DECIMA QUINTA. CUMPLIMIENTO LABORAL. La relacion laboral se ajusta a la legislacion aplicable y politicas internas de cumplimiento.'),
    ('jurisdiccion', 'CL_JUR_MX_CDMX', 'neutral', 100, 'CLAUSULA FINAL. JURISDICCION Y LEY APLICABLE. Las partes se someten a leyes federales mexicanas y tribunales competentes de Ciudad de Mexico.'),
    ('jurisdiccion', 'CL_JUR_ARB_MX', 'neutral', 10, 'CLAUSULA FINAL. SOLUCION DE CONTROVERSIAS. Las controversias se resolveran por arbitraje comercial en Mexico conforme al reglamento pactado.')
),
inserted_clauses AS (
  INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority, status)
  SELECT
    seed.clause_code,
    ct.id,
    'MX',
    'es',
    seed.risk_level,
    seed.selection_priority,
    'active'
  FROM clause_seed seed
  JOIN clause_types ct ON ct.code = seed.type_code
  RETURNING id, code
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active, created_by)
SELECT
  c.id,
  '2.0.0',
  seed.content_template,
  'major',
  true,
  'legal_ai_draft'
FROM inserted_clauses c
JOIN clause_seed seed ON seed.clause_code = c.code;

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"has_confidentiality","value":true}'::jsonb
FROM clauses WHERE code = 'CL_CONF_STANDARD_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"includes_sla","value":true}'::jsonb
FROM clauses WHERE code = 'CL_SLA_STANDARD_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"has_ip_transfer","value":true}'::jsonb
FROM clauses WHERE code = 'CL_IP_STANDARD_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"requires_advance_payment","value":true}'::jsonb
FROM clauses WHERE code = 'CL_PAYMENT_ADVANCE_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'requires', '{"target_type_code":"forma_pago"}'::jsonb
FROM clauses WHERE code = 'CL_PRICE_STANDARD_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'excludes', '{"target_clause_code":"CL_PAYMENT_STANDARD_MX"}'::jsonb
FROM clauses WHERE code = 'CL_PAYMENT_ADVANCE_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"dispute_resolution_arbitration","value":true}'::jsonb
FROM clauses WHERE code = 'CL_JUR_ARB_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'mutex', '{"target_clause_code":"CL_JUR_MX_CDMX"}'::jsonb
FROM clauses WHERE code = 'CL_JUR_ARB_MX';

WITH blueprint_seed(code, name, mandatory_clause_types, default_clause_order) AS (
  VALUES
    ('services_standard', 'Contrato de Prestacion de Servicios Profesionales', ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','confidencialidad','propiedad_intelectual','terminacion','responsabilidades','jurisdiccion']::text[]),
    ('nda_only', 'Convenio de Confidencialidad', ARRAY['definiciones','objeto','confidencialidad','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','confidencialidad','datos_personales','vigencia','terminacion','jurisdiccion']::text[]),
    ('saas_agreement', 'Contrato SaaS', ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','sla','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','confidencialidad','datos_personales','sla','responsabilidades','terminacion','jurisdiccion']::text[]),
    ('software_license', 'Contrato de Licencia de Software', ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','propiedad_intelectual','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','confidencialidad','propiedad_intelectual','terminacion','jurisdiccion']::text[]),
    ('maintenance_support', 'Contrato de Mantenimiento y Soporte', ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','sla','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','confidencialidad','sla','terminacion','jurisdiccion']::text[]),
    ('consulting_services', 'Contrato de Consultoria', ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','confidencialidad','propiedad_intelectual','terminacion','jurisdiccion']::text[]),
    ('independent_contractor', 'Contrato de Prestador Independiente', ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','confidencialidad','terminacion','jurisdiccion']::text[]),
    ('supply_goods', 'Contrato de Suministro', ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','responsabilidades','terminacion','jurisdiccion']::text[]),
    ('distribution', 'Contrato de Distribucion', ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','forma_pago','vigencia','no_competencia','responsabilidades','terminacion','jurisdiccion']::text[]),
    ('purchase_sale', 'Contrato de Compraventa Mercantil', ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','responsabilidades','terminacion','jurisdiccion']::text[]),
    ('commercial_lease', 'Contrato de Arrendamiento Comercial', ARRAY['definiciones','objeto','arrendamiento_inmueble','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','arrendamiento_inmueble','contraprestacion','forma_pago','vigencia','responsabilidades','terminacion','jurisdiccion']::text[]),
    ('loan_agreement', 'Contrato de Mutuo', ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','responsabilidades','terminacion','jurisdiccion']::text[]),
    ('partnership', 'Convenio de Colaboracion Empresarial', ARRAY['definiciones','objeto','alcance','contraprestacion','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','alcance','contraprestacion','confidencialidad','propiedad_intelectual','vigencia','terminacion','jurisdiccion']::text[]),
    ('employment', 'Contrato Individual de Trabajo', ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','cumplimiento_laboral','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','contraprestacion','forma_pago','vigencia','cumplimiento_laboral','responsabilidades','terminacion','jurisdiccion']::text[]),
    ('data_processing', 'Acuerdo de Tratamiento de Datos', ARRAY['definiciones','objeto','confidencialidad','datos_personales','vigencia','terminacion','jurisdiccion']::text[], ARRAY['definiciones','objeto','confidencialidad','datos_personales','vigencia','responsabilidades','terminacion','jurisdiccion']::text[])
)
INSERT INTO contract_blueprints (code, name, jurisdiction, mandatory_clause_types, default_clause_order)
SELECT code, name, 'MX', mandatory_clause_types, default_clause_order
FROM blueprint_seed;

WITH mapping(blueprint_code, clause_code) AS (
  VALUES
    -- Services
    ('services_standard','CL_DEF_GENERAL_MX'), ('services_standard','CL_OBJ_SERVICES_MX'), ('services_standard','CL_SCOPE_STANDARD_MX'), ('services_standard','CL_PRICE_STANDARD_MX'),
    ('services_standard','CL_PAYMENT_STANDARD_MX'), ('services_standard','CL_PAYMENT_ADVANCE_MX'), ('services_standard','CL_TERM_STANDARD_MX'), ('services_standard','CL_CONF_STANDARD_MX'),
    ('services_standard','CL_IP_STANDARD_MX'), ('services_standard','CL_TERMINATION_STANDARD_MX'), ('services_standard','CL_LIABILITY_STANDARD_MX'),
    ('services_standard','CL_JUR_MX_CDMX'), ('services_standard','CL_JUR_ARB_MX'),
    -- NDA
    ('nda_only','CL_DEF_GENERAL_MX'), ('nda_only','CL_OBJ_NDA_MX'), ('nda_only','CL_CONF_STANDARD_MX'), ('nda_only','CL_CONF_NDA_STRICT_MX'),
    ('nda_only','CL_DPA_STANDARD_MX'), ('nda_only','CL_TERM_STANDARD_MX'), ('nda_only','CL_TERMINATION_STANDARD_MX'), ('nda_only','CL_JUR_MX_CDMX'), ('nda_only','CL_JUR_ARB_MX'),
    -- SaaS
    ('saas_agreement','CL_DEF_GENERAL_MX'), ('saas_agreement','CL_OBJ_SAAS_MX'), ('saas_agreement','CL_SCOPE_STANDARD_MX'), ('saas_agreement','CL_PRICE_STANDARD_MX'),
    ('saas_agreement','CL_PAYMENT_STANDARD_MX'), ('saas_agreement','CL_PAYMENT_ADVANCE_MX'), ('saas_agreement','CL_TERM_STANDARD_MX'), ('saas_agreement','CL_CONF_STANDARD_MX'),
    ('saas_agreement','CL_DPA_STANDARD_MX'), ('saas_agreement','CL_SLA_STANDARD_MX'), ('saas_agreement','CL_TERMINATION_STANDARD_MX'),
    ('saas_agreement','CL_LIABILITY_STANDARD_MX'), ('saas_agreement','CL_JUR_MX_CDMX'), ('saas_agreement','CL_JUR_ARB_MX'),
    -- License
    ('software_license','CL_DEF_GENERAL_MX'), ('software_license','CL_OBJ_LICENSE_MX'), ('software_license','CL_PRICE_STANDARD_MX'),
    ('software_license','CL_PAYMENT_STANDARD_MX'), ('software_license','CL_PAYMENT_ADVANCE_MX'), ('software_license','CL_TERM_STANDARD_MX'),
    ('software_license','CL_CONF_STANDARD_MX'), ('software_license','CL_IP_STANDARD_MX'), ('software_license','CL_TERMINATION_STANDARD_MX'),
    ('software_license','CL_JUR_MX_CDMX'), ('software_license','CL_JUR_ARB_MX'),
    -- Maintenance and support
    ('maintenance_support','CL_DEF_GENERAL_MX'), ('maintenance_support','CL_OBJ_MAINTENANCE_SUPPORT_MX'), ('maintenance_support','CL_SCOPE_STANDARD_MX'),
    ('maintenance_support','CL_PRICE_STANDARD_MX'), ('maintenance_support','CL_PAYMENT_STANDARD_MX'), ('maintenance_support','CL_PAYMENT_ADVANCE_MX'),
    ('maintenance_support','CL_TERM_STANDARD_MX'), ('maintenance_support','CL_CONF_STANDARD_MX'), ('maintenance_support','CL_SLA_STANDARD_MX'),
    ('maintenance_support','CL_TERMINATION_STANDARD_MX'), ('maintenance_support','CL_JUR_MX_CDMX'), ('maintenance_support','CL_JUR_ARB_MX'),
    -- Consulting
    ('consulting_services','CL_DEF_GENERAL_MX'), ('consulting_services','CL_OBJ_CONSULTING_MX'), ('consulting_services','CL_SCOPE_STANDARD_MX'),
    ('consulting_services','CL_PRICE_STANDARD_MX'), ('consulting_services','CL_PAYMENT_STANDARD_MX'), ('consulting_services','CL_PAYMENT_ADVANCE_MX'),
    ('consulting_services','CL_TERM_STANDARD_MX'), ('consulting_services','CL_CONF_STANDARD_MX'), ('consulting_services','CL_IP_STANDARD_MX'),
    ('consulting_services','CL_TERMINATION_STANDARD_MX'), ('consulting_services','CL_JUR_MX_CDMX'), ('consulting_services','CL_JUR_ARB_MX'),
    -- Independent contractor
    ('independent_contractor','CL_DEF_GENERAL_MX'), ('independent_contractor','CL_OBJ_INDEPENDENT_CONTRACTOR_MX'), ('independent_contractor','CL_SCOPE_STANDARD_MX'),
    ('independent_contractor','CL_PRICE_STANDARD_MX'), ('independent_contractor','CL_PAYMENT_STANDARD_MX'), ('independent_contractor','CL_PAYMENT_ADVANCE_MX'),
    ('independent_contractor','CL_TERM_STANDARD_MX'), ('independent_contractor','CL_CONF_STANDARD_MX'), ('independent_contractor','CL_TERMINATION_STANDARD_MX'),
    ('independent_contractor','CL_JUR_MX_CDMX'), ('independent_contractor','CL_JUR_ARB_MX'),
    -- Supply
    ('supply_goods','CL_DEF_GENERAL_MX'), ('supply_goods','CL_OBJ_SUPPLY_MX'), ('supply_goods','CL_SCOPE_STANDARD_MX'), ('supply_goods','CL_PRICE_STANDARD_MX'),
    ('supply_goods','CL_PAYMENT_STANDARD_MX'), ('supply_goods','CL_PAYMENT_ADVANCE_MX'), ('supply_goods','CL_TERM_STANDARD_MX'),
    ('supply_goods','CL_LIABILITY_STANDARD_MX'), ('supply_goods','CL_TERMINATION_STANDARD_MX'), ('supply_goods','CL_JUR_MX_CDMX'), ('supply_goods','CL_JUR_ARB_MX'),
    -- Distribution
    ('distribution','CL_DEF_GENERAL_MX'), ('distribution','CL_OBJ_DISTRIBUTION_MX'), ('distribution','CL_SCOPE_STANDARD_MX'), ('distribution','CL_PRICE_STANDARD_MX'),
    ('distribution','CL_PAYMENT_STANDARD_MX'), ('distribution','CL_PAYMENT_ADVANCE_MX'), ('distribution','CL_TERM_STANDARD_MX'),
    ('distribution','CL_NONCOMPETE_STANDARD_MX'), ('distribution','CL_LIABILITY_STANDARD_MX'), ('distribution','CL_TERMINATION_STANDARD_MX'),
    ('distribution','CL_JUR_MX_CDMX'), ('distribution','CL_JUR_ARB_MX'),
    -- Purchase and sale
    ('purchase_sale','CL_DEF_GENERAL_MX'), ('purchase_sale','CL_OBJ_PURCHASE_SALE_MX'), ('purchase_sale','CL_PRICE_STANDARD_MX'),
    ('purchase_sale','CL_PAYMENT_STANDARD_MX'), ('purchase_sale','CL_PAYMENT_ADVANCE_MX'), ('purchase_sale','CL_TERM_STANDARD_MX'),
    ('purchase_sale','CL_LIABILITY_STANDARD_MX'), ('purchase_sale','CL_TERMINATION_STANDARD_MX'), ('purchase_sale','CL_JUR_MX_CDMX'), ('purchase_sale','CL_JUR_ARB_MX'),
    -- Lease
    ('commercial_lease','CL_DEF_GENERAL_MX'), ('commercial_lease','CL_OBJ_LEASE_MX'), ('commercial_lease','CL_LEASE_PROPERTY_STANDARD_MX'),
    ('commercial_lease','CL_PRICE_STANDARD_MX'), ('commercial_lease','CL_PAYMENT_STANDARD_MX'), ('commercial_lease','CL_PAYMENT_ADVANCE_MX'),
    ('commercial_lease','CL_TERM_STANDARD_MX'), ('commercial_lease','CL_LIABILITY_STANDARD_MX'), ('commercial_lease','CL_TERMINATION_STANDARD_MX'),
    ('commercial_lease','CL_JUR_MX_CDMX'), ('commercial_lease','CL_JUR_ARB_MX'),
    -- Loan
    ('loan_agreement','CL_DEF_GENERAL_MX'), ('loan_agreement','CL_OBJ_LOAN_MX'), ('loan_agreement','CL_PRICE_STANDARD_MX'),
    ('loan_agreement','CL_PAYMENT_STANDARD_MX'), ('loan_agreement','CL_PAYMENT_ADVANCE_MX'), ('loan_agreement','CL_TERM_STANDARD_MX'),
    ('loan_agreement','CL_LIABILITY_STANDARD_MX'), ('loan_agreement','CL_TERMINATION_STANDARD_MX'), ('loan_agreement','CL_JUR_MX_CDMX'), ('loan_agreement','CL_JUR_ARB_MX'),
    -- Partnership
    ('partnership','CL_DEF_GENERAL_MX'), ('partnership','CL_OBJ_PARTNERSHIP_MX'), ('partnership','CL_SCOPE_STANDARD_MX'),
    ('partnership','CL_PRICE_STANDARD_MX'), ('partnership','CL_TERM_STANDARD_MX'), ('partnership','CL_CONF_STANDARD_MX'),
    ('partnership','CL_IP_STANDARD_MX'), ('partnership','CL_TERMINATION_STANDARD_MX'), ('partnership','CL_JUR_MX_CDMX'), ('partnership','CL_JUR_ARB_MX'),
    -- Employment
    ('employment','CL_DEF_GENERAL_MX'), ('employment','CL_OBJ_EMPLOYMENT_MX'), ('employment','CL_PRICE_STANDARD_MX'),
    ('employment','CL_PAYMENT_STANDARD_MX'), ('employment','CL_PAYMENT_ADVANCE_MX'), ('employment','CL_TERM_STANDARD_MX'),
    ('employment','CL_LABOR_COMPLIANCE_STANDARD_MX'), ('employment','CL_LIABILITY_STANDARD_MX'), ('employment','CL_TERMINATION_STANDARD_MX'),
    ('employment','CL_JUR_MX_CDMX'), ('employment','CL_JUR_ARB_MX'),
    -- Data processing
    ('data_processing','CL_DEF_GENERAL_MX'), ('data_processing','CL_OBJ_DATA_PROCESSING_MX'), ('data_processing','CL_CONF_STANDARD_MX'),
    ('data_processing','CL_DPA_STANDARD_MX'), ('data_processing','CL_TERM_STANDARD_MX'), ('data_processing','CL_LIABILITY_STANDARD_MX'),
    ('data_processing','CL_TERMINATION_STANDARD_MX'), ('data_processing','CL_JUR_MX_CDMX'), ('data_processing','CL_JUR_ARB_MX')
)
INSERT INTO blueprint_clauses (blueprint_id, clause_id)
SELECT b.id, c.id
FROM mapping m
JOIN contract_blueprints b ON b.code = m.blueprint_code
JOIN clauses c ON c.code = m.clause_code;

INSERT INTO blueprint_release_gates (
  blueprint_id,
  approval_status,
  approved_by,
  approved_at,
  checklist,
  notes
)
SELECT
  id,
  'approved',
  'legal_team_review',
  now(),
  jsonb_build_object(
    'validacion_juridica', true,
    'variables_obligatorias', true,
    'redaccion_estandar', true,
    'matriz_e2e_aprobada', true
  ),
  'Aprobacion inicial catalogo cerrado MX v1 (borrador IA + validacion legal).'
FROM contract_blueprints;

COMMIT;
