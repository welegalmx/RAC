# Actualización a Seed Real v1 - Instrucciones de Implementación

**Fecha:** 2026-01-29  
**Versión:** 1.0.0  
**Estado:** Listo para Ejecución

---

## ✅ Cambios Realizados

### 1. Schema Actualizado (`src/schemas/racSchemas.ts`)

**Nuevos Campos Agregados:**

```typescript
logic_flags: {
  ...
  has_client_cooperation_required: boolean // NUEVO
  ...
}

variables: {
  parties: { ... }, // SIN CAMBIOS
  commercial_terms: { ... }, // SIN CAMBIOS
  
  // NUEVOS BLOQUES:
  service_terms: {
    service_description: string | null,
    deliverables_description: string | null,
    delivery_timeline: string | null
  },
  client_obligations: {
    client_cooperation_items: string | null
  },
  term_terms: {
    contract_duration_months: string | null,
    termination_notice_days: number | null
  },
  payment_terms: {
    payment_method: string | null
  }
}
```

**Compatibilidad:** ✅ Aditiva (no rompe diagnósticos existentes)

---

### 2. AI Reasoning Service Actualizado (`src/services/aiReasoningService.ts`)

**Cambios en Prompt:**
- ✅ Instrucciones para extraer `service_description` (CRÍTICO)
- ✅ Guía de triggers para `has_client_cooperation_required`
- ✅ Mapeo explícito de keywords a flags
- ✅ Énfasis en null discipline (no inventar datos)

---

## 🧪 Pruebas de Compatibilidad (Pre-Seed)

### Test A: Caso Completo (READY)

Este curl debe resultar en `status: "READY"` con TODAS las nuevas variables pobladas.

```bash
curl -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Necesito un contrato de servicios de desarrollo de software para el cliente Acme Corp. Mi empresa Devs Unidos prestará servicios de desarrollo y consultoría tecnológica. El proyecto consiste en crear una plataforma web de e-commerce con entregables mensuales durante 6 meses. El cliente nos pagará 80,000 MXN mensuales mediante transferencia bancaria a 15 días. Inicio el 1 de marzo de 2026. Requiero confidencialidad estricta porque manejaremos datos sensibles. El cliente debe proporcionarnos acceso a sus servidores AWS y credenciales de API. La terminación requiere 30 días de preaviso. Este será un proyecto de obra por encargo donde el cliente será dueño de todo el código.",
    "context": {
      "jurisdiction": "MX",
      "user_role": "lawyer"
    },
    "options": {
      "model_tier": "standard"
    }
  }'
```

**Validación Esperada:**
```json
{
  "success": true,
  "generation_id": "[UUID]",
  "diagnosis": {
    "status": "READY",
    "classification": {
      "intent_code": "services_standard",
      "jurisdiction": "MX"
    },
    "logic_flags": {
      "has_confidentiality": true,
      "has_ip_transfer": true,
      "has_client_cooperation_required": true
    },
    "variables": {
      "parties": {
        "provider_name": "Devs Unidos",
        "client_name": "Acme Corp",
        "effective_date": "2026-03-01"
      },
      "commercial_terms": {
        "amount": 80000,
        "currency": "MXN",
        "payment_term_days": 15
      },
      "service_terms": {
        "service_description": "desarrollo y consultoría tecnológica",
        "deliverables_description": "plataforma web de e-commerce con entregables mensuales",
        "delivery_timeline": "6 meses"
      },
      "client_obligations": {
        "client_cooperation_items": "acceso a servidores AWS y credenciales de API"
      },
      "term_terms": {
        "contract_duration_months": "6 meses",
        "termination_notice_days": 30
      },
      "payment_terms": {
        "payment_method": "transferencia bancaria"
      }
    }
  }
}
```

---

### Test B: Caso Incompleto (MISSING_INFO)

Este curl debe resultar en `status: "MISSING_INFO"` con algunos campos en `null`.

```bash
curl -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Quiero un contrato de servicios para mi cliente. Habrá confidencialidad.",
    "context": {
      "jurisdiction": "MX"
    }
  }'
```

**Validación Esperada:**
```json
{
  "success": true,
  "generation_id": "[UUID]",
  "diagnosis": {
    "status": "MISSING_INFO",
    "classification": {
      "intent_code": "services_standard",
      "jurisdiction": "MX"
    },
    "logic_flags": {
      "has_confidentiality": true,
      "has_ip_transfer": false,
      "has_client_cooperation_required": false
    },
    "variables": {
      "parties": {
        "provider_name": null,
        "client_name": null,
        "effective_date": null
      },
      "commercial_terms": {
        "amount": null,
        "currency": null,
        "payment_term_days": null
      },
      "service_terms": {
        "service_description": null,
        "deliverables_description": null,
        "delivery_timeline": null
      },
      "client_obligations": {
        "client_cooperation_items": null
      },
      "term_terms": {
        "contract_duration_months": null,
        "termination_notice_days": null
      },
      "payment_terms": {
        "payment_method": null
      }
    },
    "missing_info_request": [
      "Nombre del proveedor",
      "Nombre del cliente",
      "Descripción de los servicios",
      "Monto de la contraprestación",
      "Moneda",
      "Plazo de pago"
    ]
  }
}
```

---

## 🚀 Cargar Seed Real v1

### Prerequisitos:
1. ✅ Schema actualizado
2. ✅ AiReasoningService actualizado
3. ✅ Tests A y B ejecutados y validados
4. ✅ Servidor en ejecución

### Paso 1: Ejecutar Script de Seed

```bash
# Desde la raíz del proyecto:
npx ts-node -e "
import { pool } from './src/config/db';
import fs from 'fs';

async function loadSeed() {
  const sql = fs.readFileSync('./seed_rac_real_v1.sql', 'utf-8');
  await pool.query(sql);
  console.log('✅ Seed real v1 cargado exitosamente');
  process.exit(0);
}
loadSeed().catch(e => { console.error('❌ Error:', e); process.exit(1); });
"
```

**Alternativa (si existe un script de seeding):**
```bash
npx ts-node src/scripts/runSeed.ts seed_rac_real_v1.sql
```

**Validación Post-Seed:**
```bash
# Verificar que se cargaron 12 cláusulas:
npx ts-node -e "
import { pool } from './src/config/db';
async function check() {
  const res = await pool.query('SELECT COUNT(*) FROM clauses WHERE status = \'active\'');
  console.log('Cláusulas activas:', res.rows[0].count);
  process.exit(0);
}
check();
"
```

**Resultado Esperado:** `Cláusulas activas: 12`

---

### Paso 2: Smoke Test End-to-End con Seed Real

```bash
# 1. DIAGNOSE (con todas las variables)
GEN_ID=$(curl -s -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Contrato de desarrollo de software. Proveedor: TechCorp. Cliente: Retail Inc. Servicios: desarrollo de sistema de inventario y asesoría técnica. Entregables: módulos funcionales cada mes durante 8 meses. Monto: 120,000 MXN mensuales a 30 días por transferencia. Inicio: 1 de abril de 2026. Con confidencialidad estricta. El cliente dará acceso a base de datos y documentación interna. Terminación con 45 días de aviso. Propiedad intelectual será del cliente.",
    "context": { "jurisdiction": "MX" }
  }' | jq -r '.generation_id')

echo "Generation ID: $GEN_ID"

# 2. RETRIEVE
curl -s -X POST http://localhost:3000/api/v1/generate/$GEN_ID/retrieve | jq '.selected_count, .selected_clauses[].code'

# 3. DRAFT
curl -s -X POST http://localhost:3000/api/v1/generate/$GEN_ID/draft | jq -r '.draft_text' | head -50
```

**Validación Final:**

1. ✅ `selected_count`: debe ser ≥10 (incluye triggers activados)
2. ✅ `selected_clauses` debe incluir:
   - `CL_DEF_SERVICES_MX`
   - `CL_OBJ_SERVICES_INDEPENDENT`
   - `CL_OBLIG_PROV_STANDARD`
   - `CL_OBLIG_CLIENT_STANDARD` (por trigger)
   - `CL_PRICE_FIXED_PLUSIVA`
   - `CL_PAYMENT_INVOICE_STANDARD`
   - `CL_TERM_FIXED_DATE`
   - `CL_CONF_MUTUAL_2YEARS` (por trigger)
   - `CL_IP_WORKMADEFORHIRE` (por trigger)
   - `CL_JUR_MX_CDMX`
3. ✅ `draft_text` NO debe contener `{{` ni `}}`
4. ✅ `draft_text` debe incluir:
   - "TechCorp" (provider_name)
   - "Retail Inc" (client_name)
   - "120000" o "120,000" (amount)
   - "desarrollo de sistema de inventario" (service_description)
   - "acceso a base de datos" (client_cooperation_items)

---

## ✅ Checklist de Aprobación

Antes de dar por completado, verificar:

- [ ] `src/schemas/racSchemas.ts` actualizado y compila sin errores
- [ ] `src/services/aiReasoningService.ts` actualizado
- [ ] Test A (completo) retorna `status: READY` con todas las variables
- [ ] Test B (incompleto) retorna `status: MISSING_INFO`
- [ ] Seed real v1 se ejecuta sin errores SQL
- [ ] Smoke test E2E genera contrato sin placeholders sin resolver
- [ ] Se verificó manualmente que las 3 reglas de trigger funcionan:
  - `has_confidentiality` → `CL_CONF_MUTUAL_2YEARS`
  - `has_ip_transfer` → `CL_IP_WORKMADEFORHIRE`
  - `has_client_cooperation_required` → `CL_OBLIG_CLIENT_STANDARD`

---

## 🎯 Resultado Final Esperado

**CONFIRMACIÓN:**  
"Seed real v1 cargado y flujo E2E OK. El motor RAC ahora soporta 12 cláusulas legales reales para contratos de prestación de servicios en México."

---

**FIN DE INSTRUCCIONES**
