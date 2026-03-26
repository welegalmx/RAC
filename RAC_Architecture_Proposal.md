# Propuesta de Arquitectura: Motor RAC (Retrieval-Augmented Contracts)
**Autor:** Antigravity (AI Senior Architect)
**Fecha:** 2026-01-29
**Tipo:** Diseño de Sistema / High-Level Design

## 1. Arquitectura del Sistema (El Modelo "Sandwich" Híbrido)

Para un sistema legal donde la auditabilidad es crítica, el LLM no debe ser el "cerebro" único, sino un procesador de lenguaje y un motor de clasificación controlado.

### Capas del Sistema

1.  **Capa de Ingesta & Normalización (API Gateway)**
    *   **Responsabilidad:** Recibir solicitud de contrato (datos crudos, intención del usuario).
    *   **Validación:** Schema strict check (Pydantic/Zod). Rechazar inputs incompletos antes de tocar IA.

2.  **Capa de Diagnóstico y Razonamiento (AI - Reasoning Core)**
    *   **Input:** Datos del usuario + Playbook de reglas legales (en lenguaje natural o semi-estructurado).
    *   **Proceso:** El LLM actúa como un *clasificador*. No redacta. Razona sobre qué cláusulas son necesarias.
    *   **Output:** JSON Estructurado.
    *   *Ejemplo Output:* `{"contract_type": "services", "jurisdiction": "MX", "modules": ["confidentiality_v2", "ip_assignment_strict_v1"], "variables": {"amount": 50000}}`
    *   **Control:** Este paso es determinista en su estructura (JSON Schema enforcement).

3.  **Capa de Recuperación Determinista (Retrieval Engine)**
    *   **Responsabilidad:** "Busca, no inventes".
    *   **Lógica:** Toma el JSON del paso anterior e interroga la Base de Datos de Cláusulas (SQL/NoSQL).
    *   **Acción:** Recupera el *texto exacto* y las reglas de las cláusulas solicitadas.
    *   **Tecnología:** Motores de reglas o consultas SQL estrictas. NO vector search para selección lógica (muy arriesgado). Usa vector search solo para "sugerencias" al humano, no para ensamblaje automático final.

4.  **Capa de Ensamblaje y Micro-Redacción (AI - Drafting Core)**
    *   **Input:** Texto base de las cláusulas recuperadas + JSON de variables.
    *   **Responsabilidad:**
        *   *Llenado de variables:* Reemplazar `{{monto}}` por `$50,000`.
        *   *Suavizado:* Si se requiere, ajustar gramática de conectores entre cláusulas (ej. "Por lo tanto", "Sin embargo").
        *   *Restricción:* Temperatura 0. Prohibido agregar obligaciones no presentes en las cláusulas recuperadas.

5.  **Capa de Auditoría y Salida**
    *   **Audit Log:** Guarda el prompt exacto, la versión de cada cláusula usada, el modelo de IA y sus parámetros.
    *   **Output:** Documento final (PDF/Docx) + Metadata Log.

---

## 2. Riesgos Técnicos y Jurídicos y Mitigación

| Riesgo | Descripción | Mitigación Técnica |
| :--- | :--- | :--- |
| **Alucinación Normativa** | La IA inventa una ley o un derecho no existente. | **Separación R/W:** La IA no escribe el fondo legal. Solo selecciona cláusulas pre-redactadas por humanos. |
| **Drift Contractual** | El contrato final no se alinea con la intención inicial. | **Validación Intermedia:** El usuario (abogado) debe aprobar el JSON de estructura (Paso 2) antes de generar el texto (Paso 4). |
| **Inconsistencia Interna** | Cláusula A contradice a Cláusula B. | **Logic Layer:** Definir reglas de exclusividad en la BD (ej. `mutex: [clause_A, clause_B]`). El sistema alerta conflicto antes de generar. |
| **Pérdida de Trazabilidad** | "No sabemos por qué la IA puso esa cláusula". | **Chain of Thought (CoT) Logging:** Guardar el "razonamiento" oculto de la IA donde explica por qué eligió X cláusula. |

---

## 3. Estructura de Cláusulas Modulares

No trates las cláusulas como texto plano ("strings"). Son **objetos**.

```json
{
  "id": "clause_confidentiality_mutual",
  "version": "2.1.0",
  "status": "APPROVED",
  "jurisdictions": ["MX", "CO", "ES"],
  "risk_level": "LOW",
  "content_template": "Las partes acuerdan mantener confidencialidad sobre {{scope}} por un periodo de {{duration}} años...",
  "logic_rules": {
    "required_input": ["scope", "duration"],
    "incompatible_with": ["clause_confidentiality_unilateral"],
    "trigger_condition": "transaction_value > 10000 OR sensitive_data == true"
  },
  "metadata": {
    "owner": "legal_ops_team",
    "last_reviewed": "2025-10-15"
  }
}
```
*   **Versionado Semántico:** `v1.0.0`. Cambios de redacción menor = patch. Cambios legales sustantivos = major.

---

## 4. Recomendaciones Clave

### A. Uso de Embeddings (Limitado)
*   **MAL USO:** Dejar que un search vectorial decida qué cláusula aplicar basándose en una consulta vaga del usuario ("necesito algo para proteger secretos").
*   **BUEN USO:**
    *   *Discovery:* Ayudar al abogado a encontrar cláusulas similares en la librería.
    *   *Quality Control:* Detectar cláusulas duplicadas o casi idénticas en la base de datos para limpieza.

### B. Razonamiento vs. Redacción
Mantén estos procesos en llamadas de API separadas (o agentes distintos).
*   **Agente Arquitecto (Reasoning):** Solo ve reglas y metadatos. Decide la estructura.
*   **Agente Redactor (Drafting):** Solo ve texto y variables. Ejecuta instrucciones de formato.
*   *Por qué:* Los LLMs que son buenos razonando lógica compleja a veces son verbosos escribiendo. Separarlos permite optimizar prompts (y modelos) para cada tarea.

### C. Versionado (Prompt Engineering as Code)
*   Los prompts del sistema (system prompts) son parte del código fuente. Deben estar en Git.
*   Si cambias el prompt de "Diagnóstico", debes correr una batería de tests de regresión para asegurar que no rompió la lógica de selección de cláusulas para casos bordes.

---

## 5. Señales de "Production Ready"

Un motor RAC está listo para integrarse a un SaaS cuando:
1.  **Idempotencia Funcional:** Para el mismo set de inputs, el JSON de estructura generado es idéntico el 100% de las veces (usando temperatura 0 y seeds si aplica).
2.  **Failsafe Defaults:** Si la IA falla o duda, el sistema hace fallback a la cláusula más conservadora/proteccionista por defecto.
3.  **Human-in-the-loop Nátivo:** La API permite devolver el JSON intermedio para que un humano lo edite antes de la generación final.
4.  **Audit Trail Completo:** Puedes reconstruir cualquier contrato generado hace 6 meses exactamente como fue entregado.

---

## 6. Errores Frecuentes (Anti-patrones)

1.  **"One Prompt to Rule Them All":** Intentar pasarle todo el contexto y pedir el contrato final en una sola llamada al LLM. Resultado: Caos, alucinaciones y falta de control.
2.  **Ignorar los "Corner Cases":** Diseñar solo para el "happy path" (contrato estándar). Los contratos legales viven en las excepciones.
3.  **Durocodificar Reglas en el Prompt:** "Si es México usa la ley X" escrito en el prompt.
    *   *Solución:* Inyectar contexto dinámicamente. El prompt debe decir "Usa las reglas provistas en el contexto", y el contexto se carga desde la BD según la jurisdicción detectada.
4.  **Subestimar el Formato:** Los abogados odian el mal formato. Si la IA rompe la numeración (1.1, 1.2, a, b...), el producto pierde confianza inmediatamente. Usa librerías dedicadas para ensamblaje de documentos (docxtpl, python-docx) y no confíes en que el LLM genere el XML del Word perfecto.
