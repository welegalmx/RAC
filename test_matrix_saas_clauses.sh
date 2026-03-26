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

  if ! echo "$diagnose_resp" | jq -e . >/dev/null 2>&1; then
    echo "FAIL diagnose: respuesta no JSON. Verifica que el servidor este activo en ${BASE_URL}."
    echo "Raw response: $diagnose_resp"
    return 1
  fi

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

run_case "vehiculo_compraventa_mx" "Necesito contrato de compraventa de vehiculo en Mexico entre Autos Delta SA de CV y Logistica Norte SA de CV. Precio 620000 MXN, marca Toyota Hilux 2022, VIN 3HGBH41JXMN109186, transferencia bancaria y entrega con factura y tarjeta de circulacion."
run_case "inmueble_compraventa_mx" "Quiero contrato de compraventa de inmueble en CDMX. Vendedor Juan Perez, Comprador Inmobiliaria Sol SA de CV, precio 8500000 MXN, anticipo 850000 MXN, remanente 7650000 MXN y firma de escritura publica en 60 dias."
run_case "real_estate_sale_reserva_dominio" "Necesito contrato de compraventa de inmueble con reserva de dominio. Vendedor Maria Lopez, Comprador Grupo Atlas SA de CV, precio 6200000 MXN, anticipo 620000 MXN y remanente 5580000 MXN, dominio reservado hasta pago total."

echo "=================================================="
echo "Matriz E2E de saas_clauses completada."
