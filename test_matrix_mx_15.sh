#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

run_case() {
  local expected_intent="$1"
  local user_request="$2"

  echo "=================================================="
  echo "Case: ${expected_intent}"

  local payload
  payload=$(jq -n \
    --arg req "$user_request" \
    '{
      user_request: $req,
      context: { jurisdiction: "MX", user_role: "lawyer" }
    }')

  local diagnose_resp
  diagnose_resp=$(curl -s -X POST "${BASE_URL}/api/v1/diagnose" \
    -H "Content-Type: application/json" \
    -d "$payload")

  local success status generation_id detected_intent
  success=$(echo "$diagnose_resp" | jq -r '.success // false')
  status=$(echo "$diagnose_resp" | jq -r '.diagnosis.status // "UNKNOWN"')
  generation_id=$(echo "$diagnose_resp" | jq -r '.generation_id // empty')
  detected_intent=$(echo "$diagnose_resp" | jq -r '.diagnosis.classification.intent_code // empty')

  if [[ "$success" != "true" || "$status" != "READY" ]]; then
    echo "FAIL diagnose: $diagnose_resp"
    return 1
  fi

  if [[ "$detected_intent" != "$expected_intent" ]]; then
    echo "FAIL intent mismatch: expected=${expected_intent} got=${detected_intent}"
    return 1
  fi

  local retrieve_resp
  retrieve_resp=$(curl -s -X POST "${BASE_URL}/api/v1/generate/${generation_id}/retrieve")
  if [[ "$(echo "$retrieve_resp" | jq -r '.success // false')" != "true" ]]; then
    echo "FAIL retrieve: $retrieve_resp"
    return 1
  fi

  local draft_resp
  draft_resp=$(curl -s -X POST "${BASE_URL}/api/v1/generate/${generation_id}/draft")
  if [[ "$(echo "$draft_resp" | jq -r '.success // false')" != "true" ]]; then
    echo "FAIL draft: $draft_resp"
    return 1
  fi

  local docx_resp
  docx_resp=$(curl -s -X POST "${BASE_URL}/api/v1/generate/${generation_id}/docx")
  if [[ "$(echo "$docx_resp" | jq -r '.success // false')" != "true" ]]; then
    echo "FAIL docx: $docx_resp"
    return 1
  fi

  echo "PASS ${expected_intent} (generation_id=${generation_id})"
}

run_case "services_standard" "Necesito un contrato de prestacion de servicios profesionales para desarrollo de software con vigencia anual, pago mensual y clausulas de confidencialidad."
run_case "nda_only" "Quiero un NDA bilateral para intercambio de informacion financiera y tecnica entre dos empresas en Mexico."
run_case "saas_agreement" "Necesito un contrato SaaS para uso de plataforma de facturacion con SLA de disponibilidad y soporte."
run_case "software_license" "Requiero un contrato de licencia de software empresarial con limites de uso y pagos semestrales."
run_case "maintenance_support" "Necesito un contrato de mantenimiento y soporte tecnico para infraestructura critica."
run_case "consulting_services" "Quiero un contrato de consultoria estrategica para optimizacion de procesos comerciales."
run_case "independent_contractor" "Necesito un contrato de contratista independiente para un especialista freelance de ciberseguridad."
run_case "supply_goods" "Requiero contrato de suministro de insumos industriales con entregas mensuales."
run_case "distribution" "Quiero un contrato de distribucion comercial de productos con territorio exclusivo en Mexico."
run_case "purchase_sale" "Necesito un contrato de compraventa mercantil de maquinaria con pago en dos exhibiciones."
run_case "commercial_lease" "Requiero un contrato de arrendamiento comercial para oficinas corporativas por 3 anos."
run_case "loan_agreement" "Necesito un contrato de mutuo mercantil para prestamo entre empresas con calendario de pago."
run_case "partnership" "Quiero un convenio de colaboracion empresarial para desarrollar una nueva linea de negocio."
run_case "employment" "Necesito un contrato individual de trabajo para puesto administrativo con prestaciones de ley."
run_case "data_processing" "Requiero un acuerdo de tratamiento de datos personales entre responsable y encargado."

echo "=================================================="
echo "Matriz E2E MX de 15 contratos completada."
