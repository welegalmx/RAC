# Recomendaciones para Normalización Legal v2

**Documento:** Plan de Evolución Post-v1  
**Versión:** 1.0.0  
**Fecha:** 2026-01-29  
**Estado:** Propuesta

---

## Contexto

Habiendo completado la **Normalización Legal v1** con 12 cláusulas core para contratos de prestación de servicios en México, este documento propone los siguientes pasos para escalar el sistema RAC de manera sostenible, manteniendo la calidad jurídica como prioridad.

---

## Lecciones Aprendidas de v1 (Pendiente de Validar)

Al ejecutar v1 en producción, buscar respuestas a:

1. **¿Qué % de contratos reales se cubrió con las 12 cláusulas?**
   - Meta: ≥70% de cobertura con modificaciones mínimas.
   
2. **¿Qué variables fueron las más problemáticas (missing/incorrectas)?**
   - Identificar campos que la IA no extrae bien.
   
3. **¿Qué cláusulas obligatorias faltaron más frecuentemente?**
   - Candidatas para ser promovidas a   mandatory.

4. **¿Qué edge cases NO se pudieron normalizar?**
   - Identificar patrones ignorados en v1.

---

## Propuestas de Expansión para v2

### 1️⃣ Versionado de Cláusulas Existentes

**Objetivo:** Crear versiones alternativas de cláusulas exitosas para cubrir matices legales.

**Ejemplos:**

| Cláusula Base | Nueva Versión | Diferencia Clave |
|:---|:---|:---|
| `CL_CONF_MUTUAL_2YEARS` | `CL_CONF_MUTUAL_5YEARS` | Plazo de 5 años (industria financiera) |
| `CL_IP_WORKMADEFORHIRE` | `CL_IP_LICENSE_NONEXCLUSIVE` | Proveedor retiene IP, otorga licencia |
| `CL_PRICE_FIXED_PLUSIVA` | `CL_PRICE_VARIABLE_MILESTONES` | Pago por hitos (no fijo) |
| `CL_TERM_FIXED_DATE` | `CL_TERM_INDEFINITE_ROLLING` | Vigencia indefinida con renovación automática |

**Criterio de Decisión:**  
- Si ≥20% de contratos reales requieren esa variante, crear nueva versión.
- Si <20%, dejar para redacción manual.

---

### 2️⃣ Nuevas Cláusulas Especializadas

**Objetivo:** Agregar cláusulas para casos de uso específicos NO cubiertos en v1.

**Candidatas:**

- **`CL_SLA_UPTIME_99`** (clause_type: `nivel_servicio`)
  - Para contratos SaaS/Hosting con garantía de disponibilidad.
  
- **`CL_INDEMNIFICATION_MUTUAL`** (clause_type: `indemnizacion`)
  - Obligación de indemnizar por daños a terceros.
  
- **`CL_AUDIT_RIGHTS`** (clause_type: `auditoria`)
  - Derecho del cliente a auditor al proveedor (común en compliance).
  
- **`CL_DATA_PROCESSING_GDPR`** (clause_type: `proteccion_datos`)
  - Para cumplimiento de GDPR/LFPDPPP (Ley de Protección de Datos en México).

- **`CL_FORCE_MAJEURE`** (clause_type: `fuerza_mayor`)
  - Exención de responsabilidad por eventos fuera de control (aunque es boilerplate, puede ser relevante).

**Criterio:**  
- Solo agregar si hay demanda real (≥10 contratos nuevos requiriéndola).
- Priorizar cláusulas con alto impacto legal (riesgo, compliance).

---

### 3️⃣ Expansión Multi-Jurisdicción

**Objetivo:** Replicar el modelo de MX para otras jurisdicciones relevantes.

**Roadmap Propuesto:**

1. **Colombia (CO)** - Similar a MX, Civil Law.
2. **Chile (CL)** - Economía estable, alta adopción tech.
3. **España (ES)** - Puerta a Europa, mismo idioma.
4. **Estados Unidos (US)** - Common Law, requiere enfoque distinto.

**Consideraciones:**
- Cada jurisdicción requiere:
  - Nuevas `clause_versions` (mismo código, distinto `jurisdiction`).
  - Validación legal local (abogado nativo).
  - Ajustes en templates (ej. IVA vs. Sales Tax).

**Esfuerzo Estimado:**  
- Primera jurisdicción (CO): 2-3 semanas (incluye validación legal).
- Jurisdicciones subsecuentes: 1 semana c/u (proceso ya establecido).

---

### 4️⃣ Lógica Avanzada de Reglas

**Objetivo:** Ir más allá de triggers simples (`if flag = true`).

**Nuevos Tipos de Reglas:**

- **Reglas Condicionales Compuestas:**
  - `IF has_confidentiality AND commercial_terms.amount > 100000 THEN include CL_CONF_MUTUAL_5YEARS`
  - Requiere lógica en `RetrievalService` más sofisticada.

- **Reglas de Exclusión Mutua (Mutex):**
  - `CL_IP_WORKMADEFORHIRE` MUTEX `CL_IP_LICENSE_*`
  - Ya soportado en el motor, agregar casos reales.

- **Reglas de Sustitución:**
  - Si `risk_appetite = aggressive`, usar `CL_LIAB_NO_WARRANTIES` en lugar de `CL_LIAB_LIMITED`.

**Riesgo:**  
- Aumento de complejidad puede reducir transparencia.
- Solo implementar si hay ROI claro.

---

### 5️⃣ Calidad y Gobernanza del Contenido Legal

**Objetivo:** Asegurar que el contenido legal se mantiene actualizado y de alta calidad.

**Procesos Propuestos:**

- **Revisión Trimestral de Cláusulas:**
  - Abogados senior revisan cláusulas activas cada 3 meses.
  - Identificar cambios legislativos que requieran actualización.

- **Workflow de Aprobación para Nuevas Cláusulas:**
  1. Normalizer propone cláusula (draft).
  2. Abogado senior revisa y aprueba.
  3. QA técnico valida sintaxis y placeholders.
  4. Se carga a STAGING primero, luego a PROD.

- **Métricas de Calidad:**
  - % de contratos que requieren edición manual post-drafting.
  - Tiempo promedio de aprobación legal.
  - Incidencias por placeholders faltantes.

---

### 6️⃣ UX para Abogados (Herramientas de Normalización)

**Objetivo:** Facilitar que abogados (no técnicos) normalicen contratos sin tocar SQL.

**Herramientas Propuestas:**

- **Web UI para Normalización:**
  - Sube PDF del contrato.
  - Sistema identifica cláusulas (ML o manual).
  - Abogado mapea a `clause_types` existentes o crea nuevos.
  - Sistema genera SQL automáticamente.

- **Editor de Templates:**
  - WYSIWYG para redactar `content_template`.
  - Auto-validación de placeholders contra schema.
  - Preview en tiempo real.

- **Catálogo de Cláusulas Existentes:**
  - Buscador por palabra clave.
  - Comparador de versiones.
  - Vista de cuáles cláusulas son más usadas.

**Tecnología:**  
- Frontend: React/Next.js
- Backend: Endpoint `/api/v1/clauses` (CRUD)
- Validación: Zod schemas del `DiagnosisOutput`

---

### 7️⃣ Integración con Flujo de Aprobación (Workflow)

**Objetivo:** Conectar el RAC a un sistema de aprobaciones empresarials.

**Flujo Propuesto:**

1. Usuario solicita contrato via UI.
2. RAC genera draft.
3. Draft se envía automáticamente a:
   - Legal (aprobación de contenido).
   - Finanzas (aprobación de monto).
   - Cliente (firma electrónica).
4. Una vez aprobado, se genera PDF final y se archiva.

**Tecnologías:**
- Workflow Engine: Temporal.io o similar.
- E-Signature: DocuSign API.
- Almacenamiento: S3 + DB (contract_outputs).

---

### 8️⃣ Analytics y Reporting

**Objetivo:** Obtener insights del uso del RAC.

**Dashboards Propuestos:**

- **Dashboard Legal:**
  - Top 10 cláusulas más usadas.
  - % de cobertura por tipo de contrato.
  - Jurisdicciones con mayor volumen.

- **Dashboard de Negocio:**
  - Tiempo promedio de generación (Diagnose → Draft).
  - Contratos generados por semana.
  - Tasa de éxito (% de contratos que NO requieren edición manual).

**Herramienta:**  
- Metabase o Looker conectado a la BD de Supabase.

---

## Priorización Recomendada (Roadmap v2)

### Inmediato (Próximas 2-4 semanas):
1. ✅ Validar v1 con contratos reales (mínimo 10 casos).
2. ✅ Identificar las 3 cláusulas faltantes más críticas.
3. ✅ Crear 2-3 versiones alternativas de cláusulas exitosas.

### Corto Plazo (1-3 meses):
4. Agregar 5-7 cláusulas especializadas (SLA, Indemnización, etc.).
5. Implementar reglas condicionales compuestas.
6. Crear proceso de gobernanza (revisión trimestral).

### Mediano Plazo (3-6 meses):
7. Expansión a Colombia (primera jurisdicción adicional).
8. Desarrollar UI básica de normalización para abogados.
9. Implementar analytics dashboard.

### Largo Plazo (6-12 meses):
10. Expansión a 3-4 jurisdicciones adicionales.
11. Integración con workflow de aprobaciones.
12. ML para auto-detección de cláusulas en PDFs.

---

## Restricciones NO Negociables (Mantener de v1)

- **Calidad sobre Volumen:** Preferir 50 cláusulas perfectas que 500 mediocres.
- **No Tocar Arquitectura del Motor:** El RAC funciona. No rediseñar unless absolutamente necesario.
- **Validación Legal Obligatoria:** Toda nueva cláusula DEBE ser aprobada por un abogado.
- **Idempotencia:** Scripts SQL deben ser siempre re-ejecutables sin romper datos.

---

## Métricas de Éxito para v2

| KPI | Meta v2 | Método de Medición |
|:---|---:|:---|
| Cobertura de Contratos | ≥85% | % de contratos que usan ≥90% cláusulas del RAC |
| Tasa de Edición Manual | ≤10% | % de drafts que requieren cambios post-generación |
| Tiempo de Normalización | ≤2h/contrato | Tiempo promedio para agregar un nuevo tipo de contrato al RAC |
| Satisfacción Legal | ≥4.5/5 | Encuesta a abogados usuarios |

---

**FIN DE RECOMENDACIONES v2**

**Próxima Acción:** Validar v1 con casos reales antes de implementar cualquier ítem de v2.
