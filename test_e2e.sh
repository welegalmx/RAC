#!/bin/bash
set -e

echo "1. DIAGNOSE..."
RESP=$(curl -s -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Quiero un contrato de servicios para desarrollo de software. Proveedor: DevSolutions SA de CV, Cliente: TechCorp Inc. Costo $50,000 MXN mensuales + IVA. Pago a 30 días vía transferencia. Vigencia de 12 meses iniciando el 2026-02-01. Descripción del servicio: Desarrollo de App Móvil. Entregables: Código fuente y binarios. Plazo de entrega: quincenal. Cliente debe dar acceso a servidores AWS. Confidencialidad por 2 años. Cancelación con 15 días de aviso.",
    "context": {
      "jurisdiction": "MX",
      "user_role": "lawyer"
    }
  }')

echo "Response: $RESP"

ID=$(echo $RESP | jq -r '.generation_id')
STATUS=$(echo $RESP | jq -r '.diagnosis.status')

if [ "$STATUS" != "READY" ]; then
  echo "❌ Diagnosis failed or MISSING_INFO. Status: $STATUS"
  exit 1
fi

echo "✅ Generated ID: $ID"

echo "2. RETRIEVE..."
curl -s -X POST "http://localhost:3000/api/v1/generate/$ID/retrieve" | jq .

echo "3. DRAFT..."
DRAFT_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/generate/$ID/draft")
echo $DRAFT_RESP | jq .

# Extract draft text to check for placeholders
DRAFT_TEXT=$(echo $DRAFT_RESP | jq -r '.draft_text')

if [[ "$DRAFT_TEXT" == *"{{"* ]]; then
  echo "❌ Draft contains placeholders!"
  exit 1
else
  echo "✅ Draft looks clean (no {{ placeholders)."
fi
