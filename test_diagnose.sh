#!/bin/bash
echo "Testing Diagnose..."
WARN=$(curl -s -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Quiero un contrato de servicios. Proveedor: Alpha Labs SA de CV, representada por Juan Perez. Cliente: Beta Inc., por su propio derecho. Costo: $1000 USD mensuales. Vigencia: 1 año.",
    "context": { "jurisdiction": "MX", "user_id": "u123" }
  }')

echo "Response: $WARN"
ID=$(echo $WARN | jq -r '.generation_id')
echo "New ID: $ID"
