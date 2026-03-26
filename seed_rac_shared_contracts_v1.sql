-- RAC Shared Contracts Seed v1
-- Scope: only the 9 contracts provided by user

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
('declaraciones', 'Declaraciones', 20),
('objeto', 'Objeto', 30),
('precio_pago', 'Precio y Forma de Pago', 40),
('entrega_transmision', 'Entrega y Transmision', 50),
('reserva_dominio', 'Reserva de Dominio', 55),
('escritura_publica', 'Firma de Escritura Publica', 60),
('arrendamiento_vigencia', 'Vigencia de Arrendamiento', 70),
('renta_mora', 'Renta e Intereses Moratorios', 80),
('deposito_garantia', 'Deposito en Garantia', 90),
('obligado_solidario', 'Obligado Solidario', 100),
('uso_inmueble', 'Uso del Inmueble', 110),
('mantenimiento_reparaciones', 'Mantenimiento y Reparaciones', 120),
('rescision_pena', 'Rescision y Pena Convencional', 130),
('confidencialidad', 'Confidencialidad', 140),
('excepciones_confidencialidad', 'Excepciones de Confidencialidad', 150),
('devolucion_info', 'Devolucion de Informacion', 160),
('pagare_intereses', 'Intereses de Pagare', 170),
('pagare_presentacion', 'Presentacion y Protesto de Pagare', 180),
('aviso_notificacion', 'Avisos y Notificaciones', 190),
('proteccion_datos', 'Proteccion de Datos Personales', 200),
('no_competencia_exclusividad', 'No Competencia y Exclusividad', 210),
('jurisdiccion', 'Jurisdiccion y Ley Aplicable', 220);

WITH clause_seed(type_code, clause_code, risk_level, selection_priority, content_template) AS (
  VALUES
    ('definiciones', 'CL_DEF_GENERAL_SHARED_MX', 'neutral', 100, 'CLAUSULA PRIMERA. DEFINICIONES. Los terminos en mayuscula tienen el significado asignado en este instrumento y sus anexos.'),
    ('declaraciones', 'CL_DECL_PARTIES_STANDARD_MX', 'neutral', 100, 'DECLARACIONES. Las partes reconocen capacidad, personalidad y veracidad de lo declarado.'),
    ('objeto', 'CL_OBJ_SERVICES_ENTERPRISE_MX', 'neutral', 100, 'OBJETO. El Proveedor prestara a favor del Cliente los Servicios descritos en {{service_terms.service_description}}.'),
    ('objeto', 'CL_OBJ_REAL_ESTATE_PURCHASE_MX', 'neutral', 100, 'OBJETO. El Vendedor transmite al Comprador el inmueble identificado en {{property.address}} bajo modalidad ad corpus.'),
    ('objeto', 'CL_OBJ_VEHICLE_PURCHASE_MX', 'neutral', 100, 'OBJETO. El Vendedor transmite al Comprador el vehiculo {{vehicle.brand}} {{vehicle.model}} con VIN {{vehicle.vin}}.'),
    ('objeto', 'CL_OBJ_COMMERCIAL_OFFICE_LEASE_MX', 'neutral', 100, 'OBJETO. El Arrendador concede al Arrendatario el uso de inmueble para oficina comercial en {{property.address}}.'),
    ('objeto', 'CL_OBJ_RESIDENTIAL_LEASE_MX', 'neutral', 100, 'OBJETO. El Arrendador concede al Arrendatario el uso habitacional del inmueble en {{property.address}}.'),
    ('objeto', 'CL_OBJ_NDA_UNILATERAL_MX', 'neutral', 100, 'OBJETO. La Parte Receptora guardara confidencialidad de la Informacion Confidencial de la Parte Divulgante.'),
    ('objeto', 'CL_OBJ_NDA_MUTUAL_MX', 'neutral', 100, 'OBJETO. Las Partes se obligan recprocamente a no divulgar la Informacion Confidencial intercambiada.'),
    ('objeto', 'CL_OBJ_PAGARE_ON_DEMAND_MX', 'neutral', 100, 'OBJETO. El Suscriptor promete pagar incondicionalmente a la vista al Tenedor la Suma Principal.'),
    ('precio_pago', 'CL_PAYMENT_STANDARD_SALE_MX', 'neutral', 100, 'PRECIO. El precio total es {{commercial_terms.amount}} {{commercial_terms.currency}} y se pagara en la forma pactada.'),
    ('precio_pago', 'CL_PAYMENT_ANTICIPO_REMANENTE_MX', 'neutral', 10, 'PRECIO. El Comprador entrega anticipo de {{payment.down_payment_amount}} y remanente de {{payment.remaining_amount}} al otorgarse la escritura.'),
    ('entrega_transmision', 'CL_DELIVERY_VEHICLE_STANDARD_MX', 'neutral', 100, 'ENTREGA. El Vehiculo y su documentacion se entregan al firmar, quedando responsabilidad a cargo del Comprador.'),
    ('reserva_dominio', 'CL_TITLE_RESERVATION_STANDARD_MX', 'neutral', 100, 'RESERVA DE DOMINIO. El Vendedor conserva dominio hasta pago total y firma de escritura publica definitiva.'),
    ('escritura_publica', 'CL_DEED_EXECUTION_STANDARD_MX', 'neutral', 100, 'ESCRITURA PUBLICA. Se otorgara dentro de {{timeline.deed_signing_max_days}} dias naturales, salvo causas no imputables.'),
    ('arrendamiento_vigencia', 'CL_LEASE_TERM_STANDARD_MX', 'neutral', 100, 'VIGENCIA. El arrendamiento tendra plazo forzoso de {{term_terms.contract_duration_months}} meses y reglas de renovacion pactadas.'),
    ('renta_mora', 'CL_LEASE_RENT_AND_DEFAULT_INTEREST_MX', 'neutral', 100, 'RENTA E INTERESES. La renta mensual sera {{commercial_terms.amount}} y la mora causara interes del 5% mensual sobre saldos insolutos.'),
    ('deposito_garantia', 'CL_LEASE_DEPOSIT_GUARANTEE_MX', 'neutral', 100, 'DEPOSITO. El Arrendatario entrega deposito de garantia equivalente a {{deposit.amount}} para cubrir danos y adeudos.'),
    ('obligado_solidario', 'CL_LEASE_SOLIDARY_GUARANTOR_MX', 'neutral', 100, 'OBLIGADO SOLIDARIO. El obligado solidario responde de manera total e incondicional por obligaciones del Arrendatario.'),
    ('uso_inmueble', 'CL_LEASE_PROPERTY_USE_MX', 'neutral', 100, 'USO DEL INMUEBLE. El inmueble solo podra usarse conforme al destino permitido, siendo causal de rescision su uso indebido.'),
    ('mantenimiento_reparaciones', 'CL_LEASE_MAINTENANCE_REPAIRS_MX', 'neutral', 100, 'MANTENIMIENTO. Se distribuyen obligaciones de mantenimiento y reparaciones conforme a causa del deterioro y urgencia.'),
    ('rescision_pena', 'CL_RESCISION_AND_PENALTY_STANDARD_MX', 'neutral', 100, 'RESCISION Y PENA. El incumplimiento habilita rescision y pena convencional conforme al esquema de danos pactado.'),
    ('rescision_pena', 'CL_RESCISION_PENALTY_STRICT_MX', 'neutral', 10, 'RESCISION Y PENA. La parte incumplida cubrira pena equivalente al anticipo o formula pactada, sin perjuicio de danos adicionales.'),
    ('confidencialidad', 'CL_NDA_CONFIDENTIALITY_STANDARD_MX', 'neutral', 100, 'CONFIDENCIALIDAD. La parte receptora no divulgara ni usara la informacion fuera del objeto autorizado.'),
    ('confidencialidad', 'CL_NDA_CONFIDENTIALITY_STRICT_MX', 'neutral', 10, 'CONFIDENCIALIDAD ESTRICTA. Se impone deber reforzado para informacion estrategica, secretos industriales y datos sensibles.'),
    ('excepciones_confidencialidad', 'CL_NDA_EXCEPTIONS_STANDARD_MX', 'neutral', 100, 'EXCEPCIONES. No aplica confidencialidad para informacion publica, previa, de tercero legitimo o desarrollo independiente.'),
    ('devolucion_info', 'CL_NDA_RETURN_INFORMATION_MX', 'neutral', 100, 'DEVOLUCION. La informacion confidencial se devuelve o destruye en maximo 10 dias habiles tras requerimiento o terminacion.'),
    ('pagare_intereses', 'CL_PAGARE_INTERESTS_MX', 'neutral', 100, 'INTERESES. El pagare genera intereses ordinarios y moratorios con base de 360 dias y dias efectivamente transcurridos.'),
    ('pagare_presentacion', 'CL_PAGARE_PRESENTATION_MX', 'neutral', 100, 'PRESENTACION. El Suscriptor amplia plazo de presentacion a 3 anos y renuncia a protesto y notificaciones de cobro.'),
    ('aviso_notificacion', 'CL_NOTICES_STANDARD_MX', 'neutral', 100, 'AVISOS. Los avisos se realizan por escrito a domicilios y correos autorizados con acuse de recibo.'),
    ('proteccion_datos', 'CL_DATA_PROTECTION_STANDARD_MX', 'neutral', 100, 'DATOS PERSONALES. El tratamiento de datos personales se sujeta a la LFPDPPP y medidas de seguridad aplicables.'),
    ('proteccion_datos', 'CL_DATA_PROTECTION_STRICT_INDEMNITY_MX', 'neutral', 10, 'DATOS PERSONALES. La parte receptora indemnizara por incumplimiento en tratamiento de datos y brechas de seguridad.'),
    ('no_competencia_exclusividad', 'CL_NONCOMPETE_EXCLUSIVE_STRICT_MX', 'neutral', 100, 'NO COMPETENCIA Y EXCLUSIVIDAD. El Cliente se obliga a exclusividad y no competencia conforme al plazo pactado.'),
    ('jurisdiccion', 'CL_JUR_CDMX_FIXED_MX', 'neutral', 100, 'JURISDICCION. Las partes se someten a leyes mexicanas y tribunales competentes de Ciudad de Mexico.'),
    ('jurisdiccion', 'CL_JUR_VENUE_ACTOR_OPTION_MX', 'neutral', 10, 'JURISDICCION. Las partes se someten a tribunales del domicilio de la parte actora conforme al contrato.'),

    -- Servicios enterprise (texto ampliado)
    ('declaraciones', 'CL_DECL_SERVICES_ENTERPRISE_MX', 'neutral', 10, 'DECLARACIONES. I) El Cliente declara que es persona moral debidamente constituida, con representante facultado, domicilio y RFC vigentes, y capacidad legal para obligarse. II) El Proveedor declara que es persona moral debidamente constituida, con representante facultado, domicilio y RFC vigentes, y que cuenta con recursos propios para prestar los Servicios. III) Las Partes se reconocen personalidad y manifiestan ausencia de error, dolo o vicios del consentimiento.'),
    ('objeto', 'CL_OBJ_SERVICES_ENTERPRISE_FULL_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. OBJETO. El Proveedor prestara al Cliente los Servicios descritos en {{service_terms.service_description}}, directamente con personal propio o, cuando aplique, por contratistas bajo su direccion y responsabilidad. El Proveedor debera ejecutar los Servicios con diligencia profesional y en los lugares acordados por las Partes.'),
    ('precio_pago', 'CL_PAYMENT_SERVICES_ENTERPRISE_FULL_MX', 'neutral', 10, 'CLAUSULA TERCERA. CONTRAPRESTACION. El Cliente pagara al Proveedor la cantidad de {{commercial_terms.amount}} {{commercial_terms.currency}} de forma mensual contra factura valida. El plazo de pago sera de {{commercial_terms.payment_term_days}} dias naturales posteriores a la recepcion de CFDI correcto. Si la factura presenta errores fiscales o datos inexactos, el plazo correra desde la correccion y reenvio.'),
    ('rescision_pena', 'CL_RESCISION_SERVICES_ENTERPRISE_FULL_MX', 'neutral', 10, 'CLAUSULA DECIMA. RESCISION. Cualquiera de las Partes podra rescindir por incumplimiento material, inexactitud o falsedad de declaraciones no subsanada dentro de 30 dias naturales contados desde notificacion escrita. La rescision operara sin necesidad de declaracion judicial, sin perjuicio de exigir cumplimiento forzoso y danos conforme a derecho.'),
    ('confidencialidad', 'CL_CONF_SERVICES_ENTERPRISE_FULL_MX', 'neutral', 10, 'CLAUSULA DECIMA SEPTIMA. CONFIDENCIALIDAD. Las Partes mantendran estricta reserva sobre la Informacion Confidencial intercambiada para evaluar y ejecutar el Contrato, incluyendo informacion tecnica, comercial, financiera y secretos industriales. Solo podra revelarse por orden de autoridad competente, previo aviso oportuno a la parte reveladora, salvo impedimento legal.'),
    ('aviso_notificacion', 'CL_NOTICES_SERVICES_ENTERPRISE_FULL_MX', 'neutral', 10, 'CLAUSULA DECIMA OCTAVA. AVISOS. Los avisos se haran por escrito con acuse de recibo, mensajeria especializada o correo electronico con confirmacion, a los domicilios y correos de las declaraciones. Cualquier cambio de datos de contacto surtira efectos mediante aviso con 10 dias habiles de anticipacion.'),
    ('proteccion_datos', 'CL_DPA_SERVICES_ENTERPRISE_FULL_MX', 'neutral', 10, 'CLAUSULA DECIMA SEXTA. DATOS PERSONALES. Si el Proveedor accede a bases de datos del Cliente, actuara como encargado conforme a la LFPDPPP, aplicando medidas tecnicas, administrativas y fisicas de seguridad. Ante vulneracion que afecte confidencialidad, integridad o disponibilidad, el Proveedor notificara al Cliente en maximo 24 horas habiles.'),
    ('no_competencia_exclusividad', 'CL_NONCOMPETE_SERVICES_ENTERPRISE_FULL_MX', 'neutral', 10, 'CLAUSULAS DECIMA SEGUNDA Y DECIMA TERCERA. NO COMPETENCIA Y EXCLUSIVIDAD. El Cliente se obliga a no competir ni contratar terceros para actividades sustancialmente equivalentes al proyecto durante la vigencia y por 5 anos posteriores a su terminacion, salvo autorizacion escrita del Proveedor o vehiculo acordado entre Partes.'),
    ('jurisdiccion', 'CL_JUR_SERVICES_ENTERPRISE_CDMX_MX', 'neutral', 10, 'CLAUSULA VIGESIMA CUARTA. LEGISLACION Y JURISDICCION. Para interpretacion, cumplimiento y ejecucion, las Partes se someten a leyes mexicanas y tribunales competentes de Ciudad de Mexico, renunciando a cualquier otro fuero.'),

    -- Compraventa de inmueble (texto ampliado)
    ('declaraciones', 'CL_DECL_REAL_ESTATE_SALE_FULL_MX', 'neutral', 10, 'DECLARACIONES. El Vendedor declara ser propietario legitimo del inmueble, con plena capacidad legal, sin gravamenes, litigios ni restricciones de dominio, y con documentacion de propiedad disponible. El Comprador declara capacidad legal, origen licito de recursos, inspeccion fisica del inmueble y voluntad expresa de adquirir en los terminos pactados.'),
    ('objeto', 'CL_OBJ_REAL_ESTATE_SALE_FULL_MX', 'neutral', 10, 'CLAUSULA PRIMERA. OBJETO. El Vendedor vende a favor del Comprador, bajo modalidad ad corpus, el inmueble ubicado en {{property.address}}, libre de todo gravamen y limitacion de dominio, con todo cuanto de hecho y por derecho le corresponde.'),
    ('precio_pago', 'CL_PAYMENT_REAL_ESTATE_SALE_FULL_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. PRECIO. El precio total de compraventa es {{commercial_terms.amount}} {{commercial_terms.currency}}. El Comprador entrega anticipo de {{payment.down_payment_amount}} a la firma y cubrira el remanente de {{payment.remaining_amount}} al otorgamiento de la escritura publica.'),
    ('escritura_publica', 'CL_DEED_REAL_ESTATE_SALE_FULL_MX', 'neutral', 10, 'CLAUSULA TERCERA. ESCRITURA PUBLICA. La formalizacion notarial debera celebrarse dentro de {{timeline.deed_signing_max_days}} dias naturales, salvo causas no imputables a las Partes, incluyendo retrasos de autoridades o instituciones de credito.'),
    ('rescision_pena', 'CL_RESCISION_REAL_ESTATE_SALE_FULL_MX', 'neutral', 10, 'CLAUSULAS SEXTA Y SEPTIMA. RESCISION Y PENA CONVENCIONAL. El incumplimiento faculta a la parte cumplida a rescindir y exigir pena equivalente al anticipo, sin necesidad de declaracion judicial. Si incumple el Vendedor, devolvera cantidades recibidas y pagara pena; si incumple el Comprador, el Vendedor podra retener anticipo hasta cubrir la pena pactada.'),
    ('aviso_notificacion', 'CL_NOTICES_REAL_ESTATE_SALE_FULL_MX', 'neutral', 10, 'CLAUSULA OCTAVA. AVISOS. Toda comunicacion se realizara por escrito, mensajeria o correo electronico autorizado con acuse de recibo, a domicilios y correos declarados por las Partes.'),
    ('jurisdiccion', 'CL_JUR_REAL_ESTATE_SALE_FULL_MX', 'neutral', 10, 'CLAUSULA DECIMA CUARTA. LEGISLACION Y JURISDICCION. Las Partes se someten a la legislacion aplicable del lugar del inmueble y a los tribunales competentes del domicilio de la parte actora.'),

    -- NDA unilateral (texto ampliado)
    ('objeto', 'CL_OBJ_NDA_UNILATERAL_FULL_MX', 'neutral', 10, 'CLAUSULA PRIMERA. OBJETO. Toda informacion entregada por la Parte Divulgante a la Parte Receptora para fines de negociacion o relacion comercial sera Informacion Confidencial, y la Parte Receptora se obliga a no divulgarla ni usarla fuera del objeto autorizado.'),
    ('confidencialidad', 'CL_CONF_NDA_UNILATERAL_FULL_MX', 'neutral', 10, 'CLAUSULA SEGUNDA. USO DE INFORMACION CONFIDENCIAL. La Parte Receptora solo podra usar la Informacion Confidencial para evaluar y ejecutar potenciales negocios con la Parte Divulgante, siendo responsable por el uso que le den sus afiliadas, empleados, socios y asesores.'),
    ('excepciones_confidencialidad', 'CL_EXCEPTIONS_NDA_UNILATERAL_FULL_MX', 'neutral', 10, 'CLAUSULA QUINTA. EXCEPCIONES. No sera confidencial la informacion de conocimiento previo, publico no imputable, recibida de tercero legitimo o desarrollada independientemente. Si autoridad exige revelacion, la Parte Receptora notificara a la Divulgante de forma inmediata y previa, limitando la entrega a lo estrictamente requerido.'),
    ('devolucion_info', 'CL_RETURN_NDA_UNILATERAL_FULL_MX', 'neutral', 10, 'CLAUSULA SEPTIMA. DEVOLUCION. A solicitud escrita o al terminar la relacion, la Parte Receptora devolvera o destruira la Informacion Confidencial y sus soportes en un plazo maximo de 10 dias habiles, sin conservar copias no autorizadas.'),
    ('proteccion_datos', 'CL_DPA_NDA_UNILATERAL_FULL_MX', 'neutral', 10, 'CLAUSULA OCTAVA. DATOS PERSONALES. Si la Informacion Confidencial contiene datos personales, la Parte Receptora debera tratarlos conforme a la LFPDPPP y al aviso de privacidad de la Parte Divulgante.'),
    ('aviso_notificacion', 'CL_NOTICES_NDA_UNILATERAL_FULL_MX', 'neutral', 10, 'CLAUSULA NOVENA. AVISOS. Los avisos se realizaran por escrito, mensajeria o correo electronico con confirmacion de recibo, a los domicilios y correos declarados por las Partes.'),
    ('jurisdiccion', 'CL_JUR_NDA_UNILATERAL_FULL_MX', 'neutral', 10, 'CLAUSULA DECIMA QUINTA. JURISDICCION. Las Partes se someten a leyes mexicanas y tribunales competentes del domicilio de la parte actora para resolver cualquier controversia.')
),
inserted_clauses AS (
  INSERT INTO clauses (code, clause_type_id, jurisdiction, language, risk_level, selection_priority, status)
  SELECT seed.clause_code, ct.id, 'MX', 'es', seed.risk_level, seed.selection_priority, 'active'
  FROM clause_seed seed
  JOIN clause_types ct ON ct.code = seed.type_code
  RETURNING id, code
)
INSERT INTO clause_versions (clause_id, version, content_template, change_type, is_active, created_by)
SELECT c.id, '1.0.0', seed.content_template, 'major', true, 'legal_ai_normalized'
FROM inserted_clauses c
JOIN clause_seed seed ON seed.clause_code = c.code;

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'requires', '{"target_clause_code":"CL_DEED_EXECUTION_STANDARD_MX"}'::jsonb
FROM clauses WHERE code = 'CL_TITLE_RESERVATION_STANDARD_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'excludes', '{"target_clause_code":"CL_NDA_CONFIDENTIALITY_STANDARD_MX"}'::jsonb
FROM clauses WHERE code = 'CL_NDA_CONFIDENTIALITY_STRICT_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'requires', '{"target_clause_code":"CL_PAGARE_INTERESTS_MX"}'::jsonb
FROM clauses WHERE code = 'CL_PAGARE_PRESENTATION_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'requires', '{"target_clause_code":"CL_LEASE_DEPOSIT_GUARANTEE_MX"}'::jsonb
FROM clauses WHERE code = 'CL_LEASE_SOLIDARY_GUARANTOR_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"has_exclusivity","value":true}'::jsonb
FROM clauses WHERE code = 'CL_NONCOMPETE_EXCLUSIVE_STRICT_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"has_exclusivity","value":true}'::jsonb
FROM clauses WHERE code = 'CL_NONCOMPETE_SERVICES_ENTERPRISE_FULL_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"has_confidentiality","value":true}'::jsonb
FROM clauses WHERE code = 'CL_NDA_CONFIDENTIALITY_STRICT_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"has_confidentiality","value":true}'::jsonb
FROM clauses WHERE code = 'CL_CONF_NDA_UNILATERAL_FULL_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'trigger', '{"flag":"dispute_resolution_arbitration","value":true}'::jsonb
FROM clauses WHERE code = 'CL_JUR_VENUE_ACTOR_OPTION_MX';

INSERT INTO clause_rules (clause_id, rule_type, rule_definition)
SELECT id, 'mutex', '{"target_clause_code":"CL_JUR_CDMX_FIXED_MX"}'::jsonb
FROM clauses WHERE code = 'CL_JUR_VENUE_ACTOR_OPTION_MX';

WITH blueprint_seed(code, name, mandatory_clause_types, default_clause_order) AS (
  VALUES
    ('services_enterprise_exclusive_mx', 'Contrato de Prestacion de Servicios (Enterprise)', ARRAY['definiciones','declaraciones','objeto','precio_pago','rescision_pena','confidencialidad','aviso_notificacion','jurisdiccion']::text[], ARRAY['definiciones','declaraciones','objeto','precio_pago','no_competencia_exclusividad','proteccion_datos','confidencialidad','rescision_pena','aviso_notificacion','jurisdiccion']::text[]),
    ('purchase_sale_real_estate', 'Compraventa de Inmueble', ARRAY['declaraciones','objeto','precio_pago','escritura_publica','rescision_pena','aviso_notificacion','jurisdiccion']::text[], ARRAY['declaraciones','objeto','precio_pago','escritura_publica','entrega_transmision','rescision_pena','aviso_notificacion','jurisdiccion']::text[]),
    ('purchase_sale_real_estate_reserved_title', 'Compraventa de Inmueble con Reserva de Dominio', ARRAY['declaraciones','objeto','reserva_dominio','precio_pago','escritura_publica','rescision_pena','aviso_notificacion','jurisdiccion']::text[], ARRAY['declaraciones','objeto','reserva_dominio','precio_pago','escritura_publica','rescision_pena','aviso_notificacion','jurisdiccion']::text[]),
    ('commercial_office_lease', 'Arrendamiento de Oficinas', ARRAY['declaraciones','objeto','arrendamiento_vigencia','renta_mora','deposito_garantia','obligado_solidario','uso_inmueble','rescision_pena','aviso_notificacion','jurisdiccion']::text[], ARRAY['declaraciones','objeto','arrendamiento_vigencia','renta_mora','deposito_garantia','obligado_solidario','uso_inmueble','mantenimiento_reparaciones','rescision_pena','aviso_notificacion','proteccion_datos','jurisdiccion']::text[]),
    ('residential_lease_mx', 'Arrendamiento de Casa Habitacion', ARRAY['declaraciones','objeto','arrendamiento_vigencia','renta_mora','deposito_garantia','obligado_solidario','uso_inmueble','rescision_pena','aviso_notificacion','jurisdiccion']::text[], ARRAY['declaraciones','objeto','arrendamiento_vigencia','renta_mora','deposito_garantia','obligado_solidario','uso_inmueble','mantenimiento_reparaciones','rescision_pena','aviso_notificacion','proteccion_datos','jurisdiccion']::text[]),
    ('vehicle_purchase_sale_mx', 'Compraventa de Vehiculo', ARRAY['declaraciones','objeto','precio_pago','entrega_transmision','rescision_pena','aviso_notificacion','jurisdiccion']::text[], ARRAY['declaraciones','objeto','precio_pago','entrega_transmision','rescision_pena','aviso_notificacion','jurisdiccion']::text[]),
    ('promissory_note_on_demand_mx', 'Pagare a la Vista', ARRAY['objeto','pagare_intereses','pagare_presentacion','jurisdiccion']::text[], ARRAY['objeto','pagare_intereses','pagare_presentacion','aviso_notificacion','jurisdiccion']::text[]),
    ('nda_unilateral_mx', 'NDA Unilateral', ARRAY['objeto','confidencialidad','excepciones_confidencialidad','devolucion_info','jurisdiccion']::text[], ARRAY['objeto','confidencialidad','excepciones_confidencialidad','devolucion_info','proteccion_datos','aviso_notificacion','jurisdiccion']::text[]),
    ('nda_mutual_mx', 'NDA Bilateral', ARRAY['objeto','confidencialidad','excepciones_confidencialidad','devolucion_info','jurisdiccion']::text[], ARRAY['objeto','confidencialidad','excepciones_confidencialidad','devolucion_info','proteccion_datos','aviso_notificacion','jurisdiccion']::text[])
)
INSERT INTO contract_blueprints (code, name, jurisdiction, mandatory_clause_types, default_clause_order)
SELECT code, name, 'MX', mandatory_clause_types, default_clause_order
FROM blueprint_seed;

WITH mapping(blueprint_code, clause_code) AS (
  VALUES
    ('services_enterprise_exclusive_mx','CL_DEF_GENERAL_SHARED_MX'),
    ('services_enterprise_exclusive_mx','CL_DECL_SERVICES_ENTERPRISE_MX'),
    ('services_enterprise_exclusive_mx','CL_OBJ_SERVICES_ENTERPRISE_FULL_MX'),
    ('services_enterprise_exclusive_mx','CL_PAYMENT_SERVICES_ENTERPRISE_FULL_MX'),
    ('services_enterprise_exclusive_mx','CL_NONCOMPETE_SERVICES_ENTERPRISE_FULL_MX'),
    ('services_enterprise_exclusive_mx','CL_DPA_SERVICES_ENTERPRISE_FULL_MX'),
    ('services_enterprise_exclusive_mx','CL_RESCISION_SERVICES_ENTERPRISE_FULL_MX'),
    ('services_enterprise_exclusive_mx','CL_CONF_SERVICES_ENTERPRISE_FULL_MX'),
    ('services_enterprise_exclusive_mx','CL_NOTICES_SERVICES_ENTERPRISE_FULL_MX'),
    ('services_enterprise_exclusive_mx','CL_JUR_SERVICES_ENTERPRISE_CDMX_MX'),

    ('purchase_sale_real_estate','CL_DECL_REAL_ESTATE_SALE_FULL_MX'),
    ('purchase_sale_real_estate','CL_OBJ_REAL_ESTATE_SALE_FULL_MX'),
    ('purchase_sale_real_estate','CL_PAYMENT_REAL_ESTATE_SALE_FULL_MX'),
    ('purchase_sale_real_estate','CL_DEED_REAL_ESTATE_SALE_FULL_MX'),
    ('purchase_sale_real_estate','CL_RESCISION_REAL_ESTATE_SALE_FULL_MX'),
    ('purchase_sale_real_estate','CL_NOTICES_REAL_ESTATE_SALE_FULL_MX'),
    ('purchase_sale_real_estate','CL_JUR_REAL_ESTATE_SALE_FULL_MX'),

    ('purchase_sale_real_estate_reserved_title','CL_DECL_PARTIES_STANDARD_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_OBJ_REAL_ESTATE_PURCHASE_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_TITLE_RESERVATION_STANDARD_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_PAYMENT_ANTICIPO_REMANENTE_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_DEED_EXECUTION_STANDARD_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_RESCISION_AND_PENALTY_STANDARD_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_RESCISION_PENALTY_STRICT_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_NOTICES_STANDARD_MX'),
    ('purchase_sale_real_estate_reserved_title','CL_JUR_VENUE_ACTOR_OPTION_MX'),

    ('commercial_office_lease','CL_DECL_PARTIES_STANDARD_MX'),
    ('commercial_office_lease','CL_OBJ_COMMERCIAL_OFFICE_LEASE_MX'),
    ('commercial_office_lease','CL_LEASE_TERM_STANDARD_MX'),
    ('commercial_office_lease','CL_LEASE_RENT_AND_DEFAULT_INTEREST_MX'),
    ('commercial_office_lease','CL_LEASE_DEPOSIT_GUARANTEE_MX'),
    ('commercial_office_lease','CL_LEASE_SOLIDARY_GUARANTOR_MX'),
    ('commercial_office_lease','CL_LEASE_PROPERTY_USE_MX'),
    ('commercial_office_lease','CL_LEASE_MAINTENANCE_REPAIRS_MX'),
    ('commercial_office_lease','CL_RESCISION_AND_PENALTY_STANDARD_MX'),
    ('commercial_office_lease','CL_NOTICES_STANDARD_MX'),
    ('commercial_office_lease','CL_DATA_PROTECTION_STANDARD_MX'),
    ('commercial_office_lease','CL_JUR_VENUE_ACTOR_OPTION_MX'),

    ('residential_lease_mx','CL_DECL_PARTIES_STANDARD_MX'),
    ('residential_lease_mx','CL_OBJ_RESIDENTIAL_LEASE_MX'),
    ('residential_lease_mx','CL_LEASE_TERM_STANDARD_MX'),
    ('residential_lease_mx','CL_LEASE_RENT_AND_DEFAULT_INTEREST_MX'),
    ('residential_lease_mx','CL_LEASE_DEPOSIT_GUARANTEE_MX'),
    ('residential_lease_mx','CL_LEASE_SOLIDARY_GUARANTOR_MX'),
    ('residential_lease_mx','CL_LEASE_PROPERTY_USE_MX'),
    ('residential_lease_mx','CL_LEASE_MAINTENANCE_REPAIRS_MX'),
    ('residential_lease_mx','CL_RESCISION_AND_PENALTY_STANDARD_MX'),
    ('residential_lease_mx','CL_NOTICES_STANDARD_MX'),
    ('residential_lease_mx','CL_DATA_PROTECTION_STANDARD_MX'),
    ('residential_lease_mx','CL_JUR_VENUE_ACTOR_OPTION_MX'),

    ('vehicle_purchase_sale_mx','CL_DECL_PARTIES_STANDARD_MX'),
    ('vehicle_purchase_sale_mx','CL_OBJ_VEHICLE_PURCHASE_MX'),
    ('vehicle_purchase_sale_mx','CL_PAYMENT_STANDARD_SALE_MX'),
    ('vehicle_purchase_sale_mx','CL_DELIVERY_VEHICLE_STANDARD_MX'),
    ('vehicle_purchase_sale_mx','CL_RESCISION_AND_PENALTY_STANDARD_MX'),
    ('vehicle_purchase_sale_mx','CL_RESCISION_PENALTY_STRICT_MX'),
    ('vehicle_purchase_sale_mx','CL_NOTICES_STANDARD_MX'),
    ('vehicle_purchase_sale_mx','CL_JUR_VENUE_ACTOR_OPTION_MX'),

    ('promissory_note_on_demand_mx','CL_OBJ_PAGARE_ON_DEMAND_MX'),
    ('promissory_note_on_demand_mx','CL_PAGARE_INTERESTS_MX'),
    ('promissory_note_on_demand_mx','CL_PAGARE_PRESENTATION_MX'),
    ('promissory_note_on_demand_mx','CL_NOTICES_STANDARD_MX'),
    ('promissory_note_on_demand_mx','CL_JUR_CDMX_FIXED_MX'),

    ('nda_unilateral_mx','CL_OBJ_NDA_UNILATERAL_FULL_MX'),
    ('nda_unilateral_mx','CL_CONF_NDA_UNILATERAL_FULL_MX'),
    ('nda_unilateral_mx','CL_EXCEPTIONS_NDA_UNILATERAL_FULL_MX'),
    ('nda_unilateral_mx','CL_RETURN_NDA_UNILATERAL_FULL_MX'),
    ('nda_unilateral_mx','CL_DPA_NDA_UNILATERAL_FULL_MX'),
    ('nda_unilateral_mx','CL_NOTICES_NDA_UNILATERAL_FULL_MX'),
    ('nda_unilateral_mx','CL_JUR_NDA_UNILATERAL_FULL_MX'),

    ('nda_mutual_mx','CL_OBJ_NDA_MUTUAL_MX'),
    ('nda_mutual_mx','CL_NDA_CONFIDENTIALITY_STANDARD_MX'),
    ('nda_mutual_mx','CL_NDA_CONFIDENTIALITY_STRICT_MX'),
    ('nda_mutual_mx','CL_NDA_EXCEPTIONS_STANDARD_MX'),
    ('nda_mutual_mx','CL_NDA_RETURN_INFORMATION_MX'),
    ('nda_mutual_mx','CL_DATA_PROTECTION_STRICT_INDEMNITY_MX'),
    ('nda_mutual_mx','CL_NOTICES_STANDARD_MX'),
    ('nda_mutual_mx','CL_JUR_VENUE_ACTOR_OPTION_MX')
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
  'legal_team_shared_set_review',
  now(),
  jsonb_build_object(
    'validacion_juridica', true,
    'normalizacion_plantilla', true,
    'variables_obligatorias', true,
    'matriz_e2e_aprobada', true
  ),
  'Aprobacion inicial de la tanda compartida (9 contratos).'
FROM contract_blueprints;

COMMIT;
