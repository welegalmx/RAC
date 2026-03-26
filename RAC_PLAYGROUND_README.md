# RAC Engine Playground V1

Vista de pruebas para el motor RAC (Retrieval-Augmented Contracts).

## Pre-requisitos
- Node.js 18+
- Backend RAC corriendo en puerto 3000

## Instrucciones de Inicio

### 1. Iniciar Backend (Terminal 1)
En la raíz del proyecto (`scratch/`):
```bash
npx ts-node src/app.ts
```
Debe decir: `🚀 RAC Engine ... running on port 3000`

### 2. Iniciar Frontend (Terminal 2)
En la carpeta frontend (`scratch/frontend/`):
```bash
cd frontend
npm run dev -- -p 3001
```
Debe decir: `Ready in ... http://localhost:3001`

### 3. Usar el Playground
1. Abrir navegador en `http://localhost:3001`.
2. Verás el campo de texto con un prompt de ejemplo.
3. Click "Diagnose Request" -> Esperar JSON de diagnóstico.
4. (Si el status es READY) Click "Run Retrieval" -> Selecciona cláusulas.
5. Click "Generate Draft" -> Muestra el texto legal.
6. Click "Download DOCX" -> Descarga el archivo final.

## Notas
- El archivo DOCX se guarda físicamente en `outputs/` del backend.
- El botón de descarga muestra la ruta absoluta (en un entorno real se serviría el archivo via blob).
