# RAC Shared Contracts Mapping (MX)

Version: `mx-shared-v1-9`

## Matriz canonica

| Contrato fuente | intent_code | blueprint_code | Alias de clasificacion |
| --- | --- | --- | --- |
| Prestacion de servicios (enterprise) | `services_enterprise_exclusive_mx` | `services_enterprise_exclusive_mx` | servicios, exclusividad, no competencia |
| Compraventa de inmueble | `purchase_sale_real_estate` | `purchase_sale_real_estate` | compraventa de inmueble, escritura publica |
| Compraventa de inmueble con reserva | `purchase_sale_real_estate_reserved_title` | `purchase_sale_real_estate_reserved_title` | reserva de dominio, dominio reservado |
| Arrendamiento de oficinas | `commercial_office_lease` | `commercial_office_lease` | arrendamiento de oficinas, uso comercial |
| Arrendamiento casa habitacion | `residential_lease_mx` | `residential_lease_mx` | arrendamiento habitacional, casa habitacion |
| Compraventa de vehiculo | `vehicle_purchase_sale_mx` | `vehicle_purchase_sale_mx` | vehiculo, VIN, tarjeta de circulacion |
| Pagare a la vista | `promissory_note_on_demand_mx` | `promissory_note_on_demand_mx` | pagare, suscriptor, tenedor |
| NDA unilateral | `nda_unilateral_mx` | `nda_unilateral_mx` | parte divulgante, parte receptora |
| NDA bilateral | `nda_mutual_mx` | `nda_mutual_mx` | confidencialidad bilateral, parte informante |

## Tipos de clausula base para la tanda

- `definiciones`
- `declaraciones`
- `objeto`
- `precio_pago`
- `entrega_transmision`
- `reserva_dominio`
- `escritura_publica`
- `arrendamiento_vigencia`
- `renta_mora`
- `deposito_garantia`
- `obligado_solidario`
- `uso_inmueble`
- `mantenimiento_reparaciones`
- `rescision_pena`
- `confidencialidad`
- `excepciones_confidencialidad`
- `devolucion_info`
- `pagare_intereses`
- `pagare_presentacion`
- `aviso_notificacion`
- `proteccion_datos`
- `no_competencia_exclusividad`
- `jurisdiccion`

## Politica de orden

- `mandatory_clause_types`: definido por blueprint.
- `default_clause_order`: aplica para ensamblado cuando no hay restricciones de regla.
- `selection_priority`: menor valor = variante preferida del mismo `clause_type`.
