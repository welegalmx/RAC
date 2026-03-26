#!/bin/bash
set -e

# ID from previous run (or run a new one if empty)
# Use jq to extract the LAST successful generation ID from the DB via a helper or just run a new flow.
# For robustness, let's run a quick diagnose-retrieve-draft first.

echo "1. GENERATING DOC..."
RESP=$(curl -s -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Quiero un CONTRATO DE SERVICIOS INDEPENDIENTES. Fecha de firma: 20 de octubre de 2024. Proveedor: El grupo formado por Alpha Soft SA de CV y Beta Nube SC (conjuntamente Grupo Tech), representadas por Juan Pérez. Cliente: GigaCorp de México SA de CV, representada por el Lic. Pedro Páramo. Costo: $50,000 USD. Vigencia 12 meses. Servicios: Mantenimiento de servidores. Entregables: Reportes de uptime. Plazo de entrega: Cada fin de mes. Pago por transferencia a 30 días. 15 días de aviso para terminación. Cliente debe entregar accesos VPN.",
    "context": { 
        "jurisdiction": "MX",
        "user_role": "lawyer"
    }
  }')

echo "Response: $RESP"
ID=$(echo $RESP | jq -r '.generation_id')
echo "New ID: $ID"

echo "2. RETRIEVE..."
curl -s -X POST "http://localhost:3000/api/v1/generate/$ID/retrieve" > /dev/null

echo "3. DRAFT..."
curl -s -X POST "http://localhost:3000/api/v1/generate/$ID/draft" > /dev/null

echo "4. EXPORT DOCX..."
EXPORT_RESP=$(curl -s -X POST "http://localhost:3000/api/v1/generate/$ID/docx")
echo $EXPORT_RESP | jq .

PATH_FILE=$(echo $EXPORT_RESP | jq -r '.data.file_path')

if [ "$PATH_FILE" != "null" ]; then
    echo "✅ DOCX Generated at: $PATH_FILE"
    ls -lh "$PATH_FILE"
else
    echo "❌ Failed to generate DOCX"
    exit 1
fi
