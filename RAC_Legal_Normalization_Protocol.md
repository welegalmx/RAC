# Protocolo de Normalización Legal v1
**Motor RAC - Conversión de Contratos a Cláusulas Atómicas**

**Versión:** 1.0.0  
**Fecha:** 2026-01-29  
**Autores:** Equipo Legal + Ingeniería RAC  
**Audiencia:** Abogados normalizadores, Legal Ops

---

## Principios Fundamentales

1. **Calidad sobre Volumen:** Preferimos 10 cláusulas perfectas que 100 mediocres.
2. **Atomicidad Jurídica:** Una cláusula = Una intención legal clara y autónoma.
3. **Reusabilidad:** Si no aplica a ≥70% de casos similares, probablemente no sea atómica.
4. **No Mutabilidad del Motor:** El RAC no se adapta al contrato; el contrato se normaliza al RAC.

---

## Definiciones Operativas

### ¿Qué es una Cláusula Atómica?

Una cláusula atómica cumple:
1. **Propósito Único:** Regula UNA sola obligación, derecho o condición.
   - ✅ CORRECTO: "Cláusula de Confidencialidad Mutual"
   - ❌ INCORRECTO: "Cláusula de Confidencialidad, Propiedad Intelectual y No Competencia" (son 3 intenciones)
   
2. **Independencia Sintáctica:** Se puede leer sin referencias a otras cláusulas DENTRO del texto.
   - ✅ CORRECTO: "El Proveedor entregará {{deliverable}} en {{deadline_days}} días."
   - ❌ INCORRECTO: "Según lo establecido en la cláusula 3.2, el Proveedor..." (referencia interna)

3. **Variabilidad Controlada:** Las diferencias entre instancias se expresan SOLO con `{{variables}}`.
   - ✅ CORRECTO: `{{amount}} {{currency}}`
   - ❌ INCORRECTO: Texto diferente para cada monto.

---

## Árbol de Decisión: ¿Qué hacer con las diferencias?

Encontraste DOS textos similares pero diferentes. ¿Qué hacer?

### PASO 1: ¿La diferencia es solo un DATO?
**Ejemplo:** "50,000 USD" vs "100,000 MXN"  
→ **Acción:** Nueva VARIABLE. Misma cláusula, mismo `content_template`.

### PASO 2: ¿La diferencia cambia el RIESGO LEGAL?
**Ejemplo:** "El Cliente pagará en 30 días" vs "El Cliente pagará contra entrega"  
→ **Acción:** Nueva VERSIÓN (`1.0.0` → `1.1.0`) o incluso nueva CLÁUSULA si el cambio es estructural.

**Criterio de Riesgo:**
- **Minor (1.0 → 1.1):** Ajustes de redacción sin cambio de obligaciones (ej. "días naturales" → "días hábiles").
- **Major (1.0 → 2.0):** Cambio sustancial (ej. "pago fijo" → "pago variable con bonos").

### PASO 3: ¿La diferencia es un EDGE CASE (<30% de casos)?
**Ejemplo:** "Penalización del 2% por cada día de retraso después del día 7, excepto si ocurre fuerza mayor en sábado..."  
→ **Acción:** NO normalizar. Dejar como cláusula "ad-hoc" para redacción manual.

### PASO 4: ¿La diferencia indica un TIPO DISTINTO de cláusula?
**Ejemplo:** "Confidencialidad Unilateral" vs "Confidencialidad Mutual"  
→ **Acción:** Dos CLÁUSULAS distintas (`CL_CONF_UNILATERAL`, `CL_CONF_MUTUAL`).

---

## Exclusiones Explícitas: ¿Qué NO entra al RAC?

Las siguientes NO deben normalizarse (al menos en v1):

1. **Anexos Técnicos Complejos:** Cronogramas de obra, especificaciones técnicas detalladas.
   - *Razón:* Demasiado específicos, cambian constantemente.
   
2. **Cláusulas Negociadas Artesanalmente:** Acuerdos únicos producto de una negociación singular.
   - *Ejemplo:* "El Proveedor tendrá acceso exclusivo al servidor X los martes entre 2am y 4am."
   
3. **Condiciones Jurisdiccionales Raras:** Leyes aplicables de países sin volumen.
   - *Criterio:* Si no tenemos ≥5 contratos en esa jurisdicción, se deja manual.

4. **Cláusulas de Integración de Sistemas:** Texto que depende de otros contratos activos.
   - *Ejemplo:* "Este contrato se subordina al Contrato Marco firmado el..."

---

## Flujo de Normalización (Checklist)

Para cada contrato a normalizar:

- [ ] **Paso 1:** Identificar el `contract_type` (prestación de servicios, NDA, SaaS, etc.)
- [ ] **Paso 2:** Listar TODAS las cláusulas del contrato original (numeradas)
- [ ] **Paso 3:** Para cada cláusula:
  - [ ] ¿Es atómica? (propósito único)
  - [ ] ¿Ya existe una similar en el RAC? (revisar catálogo)
    - Si SÍ → ¿Es una versión nueva o solo variables?
    - Si NO → ¿Es reusable (>70%)? → Crear nueva.
  - [ ] Identificar placeholders (`{{...}}`)
  - [ ] Clasificar: Obligatoria / Opcional / Trigger
- [ ] **Paso 4:** Redactar el `content_template` limpio (sin referencias internas)
- [ ] **Paso 5:** Definir reglas lógicas si es opcional/trigger

---

## Reglas de Redacción de Templates

### Placeholders Permitidos:
- Formato: `{{category.field}}` (ej. `{{parties.provider_name}}`)
- Case: snake_case
- Tipo de datos soportados: string, number, date (ISO 8601)

### Placeholders NO Permitidos:
- ❌ Lógica condicional: `{{if has_sla}}Texto A{{else}}Texto B{{/if}}`
  - *Solución:* Crear DOS cláusulas distintas.
- ❌ Operaciones: `{{amount * 1.16}}`
  - *Solución:* Calcular en el backend antes de enviar variables.

### Estructura del Template:
```
CLÁUSULA [NÚMERO SUGERIDO]. [TÍTULO FORMAL].
[Texto legal con {{placeholders}}].
[Más texto si es necesario, respetando párrafos].
```

---

## Versionado Semántico (para Abogados)

Usamos `MAJOR.MINOR.PATCH`:

| Cambio | Versión | Ejemplo |
|:---|:---:|:---|
| Corrección ortográfica/estilo | PATCH (1.0.0 → 1.0.1) | "servicios" → "Servicios" |
| Ajuste de redacción sin cambio de fondo | MINOR (1.0.0 → 1.1.0) | "30 días naturales" → "30 días hábiles" |
| Cambio de obligación sustancial | MAJOR (1.0.0 → 2.0.0) | Agregar penalización por incumplimiento |

**Regla de Oro:** Si un abogado debe REVISAR el cambio, es MINOR o MAJOR. Si solo es estilo, es PATCH.

---

## Catálogo de clause_types (Referencia v1)

Para México, prestación de servicios:

| Código | Nombre | Obligatoria | Orden Típico |
|:---|:---|:---:|:---:|
| `definiciones` | Definiciones | ✅ | 1 |
| `objeto` | Objeto del Contrato | ✅ | 2 |
| `obligaciones_proveedor` | Obligaciones del Proveedor | ✅ | 3 |
| `obligaciones_cliente` | Obligaciones del Cliente | ⚪ | 4 |
| `contraprestacion` | Contraprestación | ✅ | 5 |
| `forma_pago` | Forma de Pago | ✅ | 6 |
| `vigencia` | Vigencia y Renovación | ✅ | 7 |
| `modificaciones` | Modificaciones al Contrato | ⚪ | 8 |
| `confidencialidad` | Confidencialidad | ⚪ (trigger) | 9 |
| `propiedad_intelectual` | Propiedad Intelectual | ⚪ (trigger) | 10 |
| `terminacion` | Terminación Anticipada | ⚪ | 11 |
| `responsabilidades` | Responsabilidades y Garantías | ⚪ | 12 |
| `jurisdiccion` | Jurisdicción y Ley Aplicable | ✅ | 99 |

---

## Validación de Calidad (Pre-Carga)

Antes de insertar una cláusula al RAC, verificar:

- [ ] **Sintaxis:** No hay typos, el español es correcto.
- [ ] **Placeholders:** Todos los `{{...}}` tienen un valor en el schema de `variables`.
- [ ] **Atomicidad:** La cláusula NO mezcla 2+ intenciones legales.
- [ ] **Neutralidad:** Si hay "riesgo legal asimétrico", debe haber versiones alternativas (ej. protectionist_provider vs protectionist_client).

---

## Casos Límite y Decisiones

### ¿Qué pasa si una cláusula tiene 3 párrafos?
**Criterio:** Si los 3 párrafos desarrollan UNA MISMA obligación, se mantienen juntos.  
**Ejemplo:** Cláusula de Confidencialidad con definición + obligación + duración.

### ¿Cómo manejar "disclaimers" o "salvaguardas"?
**Decisión v1:** Crear `clause_type` llamado `salvaguardas` y tratarlo como opcional (baja prioridad).

### ¿Qué hacer con cláusulas "boilerplate" (fuerza mayor, notificaciones)?
**Decisión v1:** NO priorizar. Estos textos rara vez se negocian y no aportan valor diferencial. Dejarlos para v2.

---

## Criterios de Éxito (KPIs de Normalización)

Una normalización exitosa cumple:

1. **Tasa de Reuso:** ≥70% de los contratos nuevos usan ≥80% de cláusulas existentes.
2. **Errores de Variables:** <5% de drafts generados requieren corrección manual de placeholders.
3. **Aprobación Legal:** ≥90% de contratos generados son aprobados por Legal sin cambios mayores.

---

**FIN DEL PROTOCOLO v1**

**Próxima Revisión:** Al completar 50 contratos normalizados.
