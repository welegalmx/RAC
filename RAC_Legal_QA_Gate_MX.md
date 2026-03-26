# RAC Legal QA Gate (MX Catalogo Cerrado)

Este gate es obligatorio antes de habilitar cualquier `contract_blueprint` en produccion.

## Checklist minimo por tipo de contrato

- Validez juridica: redaccion y estructura compatibles con practica mexicana.
- Coherencia interna: no contradicciones entre objeto, contraprestacion, vigencia y terminacion.
- Variables obligatorias: el texto no depende de placeholders no garantizados.
- Riesgo y asignacion de responsabilidad: limites y exclusiones revisados por legal.
- Mecanismo de controversias: jurisdiccion o arbitraje definido segun politica interna.
- Evidencia tecnica: caso E2E en `test_matrix_shared_set.sh` (o matriz vigente) exitoso.
- Trazabilidad de normalizacion: registro `source -> normalized` documentado.

## Politica operativa

- Un blueprint solo se usa en `/api/v1/diagnose` cuando existe fila en `blueprint_release_gates` con `approval_status = 'approved'`.
- Si un blueprint esta en `pending` o `rejected`, el API debe devolver `BLUEPRINT_NOT_FOUND` para bloquear generacion.
- Cada publicacion debe registrar `approved_by`, `approved_at`, `checklist` y `notes`.

## Auditoria recomendada

- Validar semanalmente:
  - porcentaje de blueprints aprobados vs total;
  - incidencias de `failed` por conflictos de reglas;
  - regresiones en clasificacion de intentos fuera de catalogo.
  - contratos con observaciones de normalizacion pendientes de confirmacion legal.
