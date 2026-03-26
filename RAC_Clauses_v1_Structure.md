# Cláusulas v1 - Prestación de Servicios Profesionales (México)

**Contrato Canónico:** Prestación de Servicios de Desarrollo de Software  
**Jurisdicción:** México (CDMX)  
**Versión:** 1.0.0  
**Fecha:** 2026-01-29

---

## Estructura de Cláusulas Identificadas

### CLÁUSULA 1: Definiciones
**clause_type:** `definiciones`  
**clause_code:** `CL_DEF_SERVICES_MX`  
**Obligatoriedad:** Obligatoria  
**Placeholders:**
- `{{parties.provider_name}}`
- `{{parties.client_name}}`
- `{{service_description}}` (texto breve del servicio)

**Texto (content_template):**
```
CLÁUSULA PRIMERA. DEFINICIONES.
Para efectos del presente Contrato de Prestación de Servicios Profesionales (en adelante, el "Contrato"), las Partes acuerdan las siguientes definiciones:

(a) "Proveedor": {{parties.provider_name}}.
(b) "Cliente": {{parties.client_name}}.
(c) "Servicios": {{service_description}}.
(d) "Contrato": El presente instrumento jurídico, incluyendo todos sus anexos.
(e) "Partes": El Proveedor y el Cliente, conjuntamente.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna (obligatoria siempre)

---

### CLÁUSULA 2: Objeto del Contrato
**clause_type:** `objeto`  
**clause_code:** `CL_OBJ_SERVICES_INDEPENDENT`  
**Obligatoriedad:** Obligatoria  
**Placeholders:** Ninguno (genérico)

**Texto:**
```
CLÁUSULA SEGUNDA. OBJETO.
El Proveedor se obliga a prestar al Cliente, de manera profesional e independiente, con sus propios recursos y bajo su exclusiva responsabilidad, los Servicios descritos en la Cláusula de Definiciones.

El Proveedor actuará en todo momento como contratista independiente, sin que exista relación laboral alguna entre las Partes.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna

---

### CLÁUSULA 3: Obligaciones del Proveedor
**clause_type:** `obligaciones_proveedor`  
**clause_code:** `CL_OBLIG_PROV_STANDARD`  
**Obligatoriedad:** Obligatoria  
**Placeholders:**
- `{{deliverables_description}}` (qué se entrega)
- `{{delivery_timeline}}` (plazo de entrega)

**Texto:**
```
CLÁUSULA TERCERA. OBLIGACIONES DEL PROVEEDOR.
El Proveedor se obliga a:

(a) Prestar los Servicios con la debida diligencia profesional, aplicando las mejores prácticas de la industria.
(b) Entregar {{deliverables_description}} dentro del plazo de {{delivery_timeline}}.
(c) Mantener comunicación oportuna con el Cliente respecto al avance de los Servicios.
(d) Cumplir con todas las leyes y regulaciones aplicables en el desarrollo de los Servicios.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna

---

### CLÁUSULA 4: Obligaciones del Cliente
**clause_type:** `obligaciones_cliente`  
**clause_code:** `CL_OBLIG_CLIENT_STANDARD`  
**Obligatoriedad:** Opcional (se incluye si el cliente tiene obligaciones activas)  
**Placeholders:**
- `{{client_cooperation_items}}` (qué debe proveer el cliente, ej. "acceso a servidores")

**Texto:**
```
CLÁUSULA CUARTA. OBLIGACIONES DEL CLIENTE.
El Cliente se obliga a:

(a) Proporcionar al Proveedor, en tiempo y forma, {{client_cooperation_items}} necesarios para la adecuada prestación de los Servicios.
(b) Realizar el pago de la Contraprestación en los términos establecidos en el presente Contrato.
(c) Designar un representante autorizado para la coordinación y aprobación de entregables.
```

**Versión:** 1.0.0  
**Reglas:** 
- Trigger: `has_client_cooperation_required = true`

---

### CLÁUSULA 5: Contraprestación
**clause_type:** `contraprestacion`  
**clause_code:** `CL_PRICE_FIXED_PLUSIVA`  
**Obligatoriedad:** Obligatoria  
**Placeholders:**
- `{{commercial_terms.amount}}`
- `{{commercial_terms.currency}}`

**Texto:**
```
CLÁUSULA QUINTA. CONTRAPRESTACIÓN.
Como contraprestación por la prestación de los Servicios, el Cliente pagará al Proveedor la cantidad de {{commercial_terms.amount}} {{commercial_terms.currency}} (cantidad en letra) más el Impuesto al Valor Agregado (IVA) correspondiente.

El monto especificado es fijo y no estará sujeto a incrementos salvo acuerdo por escrito entre las Partes.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna

**Nota:** Si se requiere contraprestación variable, crear nueva cláusula `CL_PRICE_VARIABLE`.

---

### CLÁUSULA 6: Forma y Condiciones de Pago
**clause_type:** `forma_pago`  
**clause_code:** `CL_PAYMENT_INVOICE_STANDARD`  
**Obligatoriedad:** Obligatoria  
**Placeholders:**
- `{{commercial_terms.payment_term_days}}`
- `{{payment_method}}` (transferencia, cheque, etc.)

**Texto:**
```
CLÁUSULA SEXTA. FORMA Y CONDICIONES DE PAGO.
El pago de la Contraprestación se realizará de la siguiente manera:

(a) El Proveedor emitirá Comprobante Fiscal Digital por Internet (CFDI) conforme a la legislación fiscal vigente en México.
(b) El Cliente realizará el pago dentro de los {{commercial_terms.payment_term_days}} días naturales siguientes a la recepción del CFDI.
(c) El pago se efectuará mediante {{payment_method}} a la cuenta bancaria que el Proveedor designe por escrito.
(d) Se considerará realizado el pago en la fecha en que los fondos sean efectivamente acreditados en la cuenta del Proveedor.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna

---

### CLÁUSULA 7: Vigencia del Contrato
**clause_type:** `vigencia`  
**clause_code:** `CL_TERM_FIXED_DATE`  
**Obligatoriedad:** Obligatoria  
**Placeholders:**
- `{{parties.effective_date}}` (fecha de inicio)
- `{{contract_duration_months}}` (duración en meses, puede ser "indefinida")

**Texto:**
```
CLÁUSULA SÉPTIMA. VIGENCIA.
El presente Contrato entrará en vigor el {{parties.effective_date}} y tendrá una vigencia de {{contract_duration_months}}, salvo que sea terminado anticipadamente conforme a lo dispuesto en este instrumento.

Las obligaciones de confidencialidad y propiedad intelectual, de existir, sobrevivirán a la terminación del Contrato según sus propios términos.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna

---

### CLÁUSULA 8: Confidencialidad (OPCIONAL - TRIGGER)
**clause_type:** `confidencialidad`  
**clause_code:** `CL_CONF_MUTUAL_2YEARS`  
**Obligatoriedad:** Opcional (activada por flag)  
**Placeholders:** Ninguno

**Texto:**
```
CLÁUSULA OCTAVA. CONFIDENCIALIDAD.
Las Partes acuerdan mantener en estricta confidencialidad toda la Información Confidencial que reciban de la otra Parte durante la vigencia del presente Contrato.

Se entiende por "Información Confidencial" aquella información de carácter técnico, comercial, financiero o de cualquier otra naturaleza que sea revelada por una Parte a la otra, ya sea de forma oral, escrita o por cualquier otro medio, y que sea identificada como confidencial o que por su naturaleza deba considerarse como tal.

La obligación de confidencialidad subsistirá por un periodo de dos (2) años contados a partir de la terminación del Contrato.
```

**Versión:** 1.0.0  
**Reglas:**
- Trigger: `has_confidentiality = true`

---

### CLÁUSULA 9: Propiedad Intelectual - Obra por Encargo (OPCIONAL - TRIGGER)
**clause_type:** `propiedad_intelectual`  
**clause_code:** `CL_IP_WORKMADEFORHIRE`  
**Obligatoriedad:** Opcional (activada por flag)  
**Placeholders:** Ninguno

**Texto:**
```
CLÁUSULA NOVENA. PROPIEDAD INTELECTUAL.
Las Partes acuerdan que los Servicios objeto del presente Contrato constituyen una "obra por encargo" en términos de la Ley Federal del Derecho de Autor de México.

Por lo tanto, todos los derechos patrimoniales, incluyendo derechos de autor y derechos conexos, sobre los entregables y productos derivados de los Servicios, serán propiedad exclusiva del Cliente desde el momento de su creación.

El Proveedor renuncia expresamente a ejercer cualquier derecho moral que pudiera limitar la explotación de los entregables por parte del Cliente.
```

**Versión:** 1.0.0  
**Reglas:**
- Trigger: `has_ip_transfer = true`

**Nota:** Si se requiere que el Proveedor RETENGA la IP, crear cláusula `CL_IP_LICENSE` (versión 2.0.0 o cláusula distinta).

---

### CLÁUSULA 10: Terminación Anticipada
**clause_type:** `terminacion`  
**clause_code:** `CL_TERM_CAUSE_NOTICE`  
**Obligatoriedad:** Opcional  
**Placeholders:**
- `{{termination_notice_days}}` (días de preaviso)

**Texto:**
```
CLÁUSULA DÉCIMA. TERMINACIÓN ANTICIPADA.
Cualquiera de las Partes podrá dar por terminado el presente Contrato de manera anticipada, por las siguientes causas:

(a) Incumplimiento sustancial de la otra Parte a las obligaciones establecidas en este Contrato, que no sea subsanado dentro de los diez (10) días naturales siguientes a la notificación por escrito del incumplimiento.
(b) Disolución, liquidación o declaración de quiebra de la otra Parte.
(c) De manera voluntaria, mediante notificación por escrito con al menos {{termination_notice_days}} días de anticipación.

En caso de terminación anticipada, el Cliente deberá pagar los Servicios efectivamente prestados hasta la fecha de terminación.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna (opcional pero común)

---

### CLÁUSULA 11: Responsabilidades y Limitación de Garantías
**clause_type:** `responsabilidades`  
**clause_code:** `CL_LIAB_LIMITED_SERVICES`  
**Obligatoriedad:** Opcional  
**Placeholders:** Ninguno

**Texto:**
```
CLÁUSULA DÉCIMA PRIMERA. RESPONSABILIDADES.
El Proveedor será responsable de prestar los Servicios con la debida diligencia profesional conforme a los términos del presente Contrato.

Sin perjuicio de lo anterior, el Proveedor no será responsable por:
(a) Daños indirectos, incidentales o consecuenciales derivados de los Servicios.
(b) Pérdidas de datos, lucro cesante o interrupción del negocio del Cliente, salvo dolo o culpa grave del Proveedor.

La responsabilidad máxima del Proveedor bajo este Contrato no excederá del monto total de la Contraprestación pagada por el Cliente.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna

---

### CLÁUSULA 12: Jurisdicción y Ley Aplicable
**clause_type:** `jurisdiccion`  
**clause_code:** `CL_JUR_MX_CDMX`  
**Obligatoriedad:** Obligatoria  
**Placeholders:** Ninguno

**Texto:**
```
CLÁUSULA DÉCIMA SEGUNDA. JURISDICCIÓN Y LEY APLICABLE.
Para la interpretación y cumplimiento del presente Contrato, las Partes se someten expresamente a las leyes federales de los Estados Unidos Mexicanos y a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando expresamente a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros o por cualquier otra causa.
```

**Versión:** 1.0.0  
**Reglas:** Ninguna

---

## Resumen de Cláusulas v1

| # | Tipo | Código | Obligatoria | Trigger |
|:---:|:---|:---|:---:|:---|
| 1 | definiciones | CL_DEF_SERVICES_MX | ✅ | - |
| 2 | objeto | CL_OBJ_SERVICES_INDEPENDENT | ✅ | - |
| 3 | obligaciones_proveedor | CL_OBLIG_PROV_STANDARD | ✅ | - |
| 4 | obligaciones_cliente | CL_OBLIG_CLIENT_STANDARD | ⚪ | `has_client_cooperation_required` |
| 5 | contraprestacion | CL_PRICE_FIXED_PLUSIVA | ✅ | - |
| 6 | forma_pago | CL_PAYMENT_INVOICE_STANDARD | ✅ | - |
| 7 | vigencia | CL_TERM_FIXED_DATE | ✅ | - |
| 8 | confidencialidad | CL_CONF_MUTUAL_2YEARS | ⚪ | `has_confidentiality` |
| 9 | propiedad_intelectual | CL_IP_WORKMADEFORHIRE | ⚪ | `has_ip_transfer` |
| 10 | terminacion | CL_TERM_CAUSE_NOTICE | ⚪ | - |
| 11 | responsabilidades | CL_LIAB_LIMITED_SERVICES | ⚪ | - |
| 12 | jurisdiccion | CL_JUR_MX_CDMX | ✅ | - |

**Total:** 12 cláusulas (7 obligatorias, 5 opcionales)

---

## Notas para Implementación SQL

### Nuevos Clause Types a Crear:
- `obligaciones_proveedor`
- `obligaciones_cliente`
- `forma_pago`
- `propiedad_intelectual`
- `terminacion`
- `responsabilidades`

### Nuevos Logic Flags a Considerar (para schema):
- `has_client_cooperation_required` (boolean)
- `has_ip_transfer` (boolean) - Ya existe como placeholder
- `has_liability_limitation` (boolean) - Futuro

### Variables del Schema a Extender:
Agregar a `DiagnosisOutputSchema.variables`:
- `service_description` (string)
- `deliverables_description` (string)
- `delivery_timeline` (string)
- `client_cooperation_items` (string, nullable)
- `contract_duration_months` (string/number)
- `termination_notice_days` (number)
- `payment_method` (string)

---

**FIN DEL DOCUMENTO DE CLÁUSULAS v1**
