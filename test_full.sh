#!/bin/bash
echo "Testing Full Data Case (READY)..."
curl -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Quiero un contrato de servicios para desarrollo de software. Proveedor: DevSolutions SA de CV, Cliente: TechCorp Inc. Costo $50,000 MXN mensuales + IVA. Pago a 30 días vía transferencia. Vigencia de 12 meses iniciando el 2026-02-01. Entregar código fuente quincenalmente. Cliente debe dar acceso a servidores AWS. Confidencialidad por 2 años. Cancelación con 15 días de aviso.",
    "context": {
      "jurisdiction": "MX",
      "user_role": "lawyer"
    }
  }'
echo -e "\n\n"
