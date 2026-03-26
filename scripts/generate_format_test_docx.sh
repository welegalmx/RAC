#!/usr/bin/env bash
# Genera un DOCX de prueba con el pipeline completo (vehículo) para revisar formato:
# montos, incisos, términos, bullets, firmas en 2 columnas.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3031}"
BASE="http://localhost:${PORT}"

BODY='{"user_request":"Necesito contrato de compraventa de vehículo en México. Vendedor: Autos Delta SA de CV, RFC ADL900101ABC, domicilio Av. Insurgentes Sur 1234 CDMX, representada por Juan Pérez. Comprador: Logística Norte SA de CV, RFC LNO850601XYZ, domicilio Blvd. López Mateos 567 Monterrey, representada por Ana Ruiz. Vehículo Toyota Hilux 2022 color blanco, VIN 3HGBH41JXMN109186, placa ABC-123-D. Precio 620000 MXN, pago por transferencia. Factura y tarjeta de circulación. Tenencias pagadas hasta 2025.","context":{"jurisdiction":"MX","user_role":"lawyer"}}'

echo "→ diagnose"
R=$(curl -fsS -X POST "$BASE/api/v1/diagnose" -H 'Content-Type: application/json' -d "$BODY")
GEN_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['generation_id'])")
echo "  generation_id=$GEN_ID"

echo "→ retrieve"
curl -fsS -X POST "$BASE/api/v1/generate/$GEN_ID/retrieve" > /dev/null

echo "→ draft"
curl -fsS -X POST "$BASE/api/v1/generate/$GEN_ID/draft" > /dev/null

echo "→ docx"
DOC=$(curl -fsS -X POST "$BASE/api/v1/generate/$GEN_ID/docx")
FILE=$(echo "$DOC" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['file_path'])")

OUT="outputs/PRUEBA_FORMATO_RAC.docx"
mkdir -p outputs
cp -f "$FILE" "$OUT"
echo "✅ Copia de revisión: $OUT"
echo "   (original del motor: $FILE)"
