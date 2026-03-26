#!/bin/bash
echo "Testing Incomplete Data Case (MISSING_INFO)..."
curl -X POST http://localhost:3000/api/v1/diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Quiero un contrato de servicios pero no sé cuánto voy a cobrar todavía.",
    "context": {
      "jurisdiction": "MX",
      "user_role": "lawyer"
    }
  }'
echo -e "\n\n"
