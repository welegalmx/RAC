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

run_case "services_enterprise_exclusive_mx" "Necesito un contrato de prestacion de servicios para desarrollo de plataforma ecommerce entre Cliente Delta SA de CV y Proveedor Nova Tech SA de CV. Monto mensual 180000 MXN mas IVA, pago a 30 dias por transferencia, vigencia 24 meses desde 2026-04-01, incluye exclusividad, no competencia por 5 anos y confidencialidad."
run_case "purchase_sale_real_estate" "Quiero contrato de compraventa de inmueble en CDMX. Vendedor Juan Perez, Comprador Inmobiliaria Sol SA de CV, precio 8500000 MXN, anticipo 850000 MXN y remanente 7650000 MXN a la firma de escritura en 60 dias."
run_case "purchase_sale_real_estate_reserved_title" "Necesito compraventa de inmueble con reserva de dominio. Vendedor Maria Lopez, Comprador Grupo Atlas SA de CV, precio 6200000 MXN, anticipo 620000 MXN y remanente 5580000 MXN. El dominio se libera hasta pago total y escritura publica."
run_case "commercial_office_lease" "Requiero arrendamiento de oficinas para uso comercial. Arrendador Carlos Ramirez, Arrendatario Orion Ventures SA de CV, Obligado Solidario Luis Torres. Renta mensual 95000 MXN incluyendo mantenimiento, deposito 95000 MXN, vigencia 12 meses desde 2026-05-01."
run_case "residential_lease_mx" "Necesito contrato de arrendamiento de casa habitacion en Guadalajara. Arrendador Ana Gutierrez, Arrendatario Pedro Silva, Obligado Solidario Laura Silva. Renta 28000 MXN mensual, deposito 28000 MXN, vigencia 12 meses, uso solo habitacional."
run_case "vehicle_purchase_sale_mx" "Quiero contrato de compraventa de vehiculo. Vendedor Autos Delta SA de CV, Comprador Logistica Norte SA de CV, marca Toyota, modelo Hilux 2022, color blanco, VIN 3HGBH41JXMN109186, precio 620000 MXN, pago por transferencia y entrega inmediata con factura y tarjeta de circulacion."
run_case "promissory_note_on_demand_mx" "Necesito un pagare a la vista. Suscriptor Comercial Vega SA de CV, Tenedor Financiera Prisma SA de CV, suma principal 450000 MXN, pago en domicilio del tenedor o transferencia, intereses ordinarios legales y moratorios al doble."
run_case "nda_unilateral_mx" "Requiero NDA unilateral donde Parte Divulgante es Sofia Martinez y Parte Receptora es BioLabs SA de CV representada por Ricardo Luna. Se compartira informacion tecnica y comercial en negociacion por 6 meses, vigencia indefinida y 2 anos posteriores, devolucion de informacion en 10 dias habiles."
run_case "nda_mutual_mx" "Necesito NDA bilateral entre Alejandro Cruz y Quantum Retail SA de CV representada por Elena Rios. Habra intercambio reciproco de informacion confidencial, excepciones estandar, proteccion de datos personales, aviso por requerimiento de autoridad en 2 dias habiles y jurisdiccion en CDMX."

echo "=================================================="
echo "Matriz E2E de contratos compartidos completada."
