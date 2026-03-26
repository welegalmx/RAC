# RAC Shared Contracts Normalization Log

Version: `mx-shared-v1-9`

Este documento registra la normalizacion automatica aplicada sobre los contratos fuente antes de convertirlos a seed.

## Reglas de normalizacion global

1. Homologar roles (`Vendedor/Comprador`, `Arrendador/Arrendatario`, `Parte Divulgante/Receptora`, `Suscriptor/Tenedor`).
2. Corregir numeracion de clausulas y referencias cruzadas.
3. Unificar placeholders a `snake_case` y rutas semanticas (`property.address`, `payment.down_payment_amount`).
4. Corregir firmas y etiquetas mal asignadas.
5. Mantener fondo juridico y estilo de redaccion original.

## Cambios por contrato

### Compraventa de inmueble
- `Normalizado`: placeholders de monto, anticipo, remanente y domicilio.
- `Corregido`: consistencia de correos en declaraciones (comprador/vendedor).
- `Corregido`: referencias internas de clausulas y firmas.

### Compraventa de inmueble con reserva de dominio
- `Normalizado`: clausula de reserva de dominio como bloque propio.
- `Corregido`: condicion de liberacion de dominio a pago total + escritura publica.
- `Corregido`: consistencia de redaccion de restricciones de disposicion.

### Arrendamiento de oficinas
- `Corregido`: referencias de clausulas no existentes (`Eventualidades`, `Extincion de Dominio`) hacia clausulas presentes.
- `Normalizado`: campos de renta, mantenimiento, deposito, penalidades y renovacion.
- `Corregido`: etiquetas de partes en seccion de notificaciones.

### Arrendamiento casa habitacion
- `Corregido`: inversion de roles detectada en declaraciones (arrendador/arrendatario).
- `Normalizado`: periodos de vigencia, holdover y penalidad.
- `Corregido`: consistencia de redaccion sobre extincion de dominio y siniestros.

### Compraventa de vehiculo
- `Corregido`: etiquetas de notificaciones (`ARRENDADOR/ARRENDATARIO` -> `VENDEDOR/COMPRADOR`).
- `Corregido`: firmas finales asignadas a la parte correcta.
- `Corregido`: numeracion de clausulas (salto de `TERCERA` a `QUINTA`).

### Pagare a la vista
- `Normalizado`: variables de principal, tasa ordinaria, tasa moratoria y base 360.
- `Corregido`: consistencia de clausulas de presentacion y renuncia a protesto.
- `Normalizado`: jurisdiccion y domicilio del suscriptor.

### Prestacion de servicios enterprise
- `Corregido`: numeracion duplicada de clausulas (`DECIMA SEXTA`).
- `Corregido`: typo `tres 30 dias` -> `30 dias`.
- `Normalizado`: segmentos de exclusividad/no competencia y fuerza mayor.

### NDA unilateral
- `Corregido`: campos de notificacion de parte receptora (evitar duplicar datos de divulgante).
- `Normalizado`: excepciones de confidencialidad y plazo post-terminacion.
- `Normalizado`: devolucion de informacion a 10 dias habiles.

### NDA bilateral
- `Normalizado`: roles `parte informante/receptora` para ambos sentidos.
- `Corregido`: clausula de idioma bilingue con prevalencia de version en espanol.
- `Normalizado`: plazo de aviso ante requerimiento de autoridad (2 dias habiles).
