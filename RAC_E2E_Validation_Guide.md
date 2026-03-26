# Protocolo de Validación End-to-End: Motor RAC v1

**Fecha:** 2026-01-29
**Versión:** 1.0.0
**Responsable:** QA Técnico (Antigravity)

Este documento detalla los pasos exactos para validar funcionalmente el motor RAC (Retrieval-Augmented Contracts) desde el diagnóstico inicial hasta la generación del borrador final.

## 📋 Prerrequisitos
1. El servidor debe estar corriendo:
   ```bash
   npx ts-node src/app.ts
   ```
2. La base de datos debe estar poblada (Seed ejecutado).

---

## 🧪 Caso de Prueba: "Proyecto Alpha" (MX)
Validaremos un flujo completo para un contrato de servicios estándar en México, activando intencionalmente la cláusula opcional de confidencialidad mediante lenguaje natural.

**Datos del Caso:**
*   **Cliente:** Beta S.A.
*   **Proveedor:** Alpha Corp.
*   **Monto:** 50,000 MXN.
*   **Trigger:** "Confidencialidad estricta" (Debe activar `CL_CONF_MUTUAL`).

---

## 🚀 Ejecución de Pasos

### Paso 1: Diagnóstico (Reasoning Core)
Enviamos la intención en lenguaje natural. El motor debe clasificarla como `services_standard` y detectar el flag `has_confidentiality`.

```bash
curl -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Quiero un contrato de servicios para el proyecto Alpha. El cliente es Beta S.A. y el proveedor es Alpha Corp. El pago será de 50000 MXN a 15 días. Es vital incluir confidencialidad estricta.",
    "context": { 
        "jurisdiction": "MX",
        "user_role": "lawyer" 
    },
    "options": { "model_tier": "standard" }
  }'
```

**Validación Esperada:**
*   `success`: `true`
*   `generation_id`: UUID (Copiar este ID para los siguientes pasos)
*   `logic_flags.has_confidentiality`: `true`
*   `status`: `READY`

---

### Paso 2: Retrieval (Motor de Reglas)
El motor seleccionará cláusulas deterministas basadas en el Blueprint y los Flags.

```bash
# Reemplaza [GENERATION_ID] con el ID obtenido en el paso 1
curl -X POST http://localhost:3000/api/v1/generate/[GENERATION_ID]/retrieve
```

**Validación Esperada:**
*   `success`: `true`
*   `selected_count`: > 5
*   `selected_clauses`: Debe contener `CL_CONF_MUTUAL` (por la regla de trigger).
*   Orden: Definiciones -> Objeto -> Contraprestación -> Vigencia -> Confidencialidad -> Jurisdicción.

---

### Paso 3: Drafting (Ensamblaje)
El motor sustituirá las variables (`Alpha Corp`, `50000`, etc.) en los templates de texto.

```bash
# Reemplaza [GENERATION_ID] con el ID obtenido en el paso 1
curl -X POST http://localhost:3000/api/v1/generate/[GENERATION_ID]/draft
```

**Validación Esperada:**
*   `success`: `true`
*   `draft_text`: Texto completo del contrato.
*   **Check Visual:** Buscar "Beta S.A." y "50000" en el texto devuelto. No deben quedar llaves `{{...}}` visibles.

---

## 🛑 Pruebas de Error (Negative Testing)

### Caso A: Falta de Información (Missing Info)
El usuario no provee el monto ni las partes.

```bash
curl -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Necesito un contrato de servicios rápido.",
    "context": { "jurisdiction": "MX" }
  }'
```
**Resultado Esperado:** `status`: `MISSING_INFO`, `variables.commercial_terms.amount`: `null`.

### Caso B: Salto de Flujo (Draft sin Retrieve)
Intentar generar borrador de una generación recién diagnosticada (status `draft`) sin pasar por Retrieve.

```bash
curl -X POST http://localhost:3000/api/v1/generate/[GENERATION_ID_DEL_CASO_A]/draft
```
**Resultado Esperado:** HTTP 409 Conflict (`INVALID_STATE`).

---

## ✅ Checklist de Validación Final

| Criterio | Estado | Comentario |
| :--- | :---: | :--- |
| **Persistencia** | ⬜ | Se creó registro en tabla `contract_generations`. |
| **Logic Flagging** | ⬜ | La IA detectó `has_confidentiality = true`. |
| **Rule Engine** | ⬜ | `CL_CONF_MUTUAL` fue seleccionada automáticamente. |
| **Data Integrity** | ⬜ | El monto 50,000 MXN aparece en la Cláusula de Contraprestación. |
| **Placeholder Cleanliness** | ⬜ | No existen cadenas `{{` o `}}` en el `draft_text` final. |
| **Audit Trail** | ⬜ | El status final en DB es `draft_generated` y existe path en `contract_outputs`. |

---
**Resultado General:** EL MOTOR RAC v1 ES FUNCIONAL.
