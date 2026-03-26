import express from 'express';
import dotenv from 'dotenv';
import { diagnoseHandler } from './controllers/diagnosisController';
import { retrieveHandler } from './controllers/generateRetrieveController';
import { draftHandler } from './controllers/generateDraftController';

// Load environment variables strictly
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.error("CRITICAL ERROR: OPENAI_API_KEY is missing in .env");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
import cors from 'cors';
import path from 'path';
app.use(cors({ origin: '*' })); // Allow all for playground

// Static file serving for generated outputs (DOCX)
app.use('/outputs', express.static(path.join(__dirname, '../outputs')));
app.use('/playground', express.static(path.join(__dirname, '../frontend')));

// Routes
// Audit Log: This is the entry point for the Reasoning Core
app.post('/api/v1/diagnose', (req, res, next) => {
    // Wrapper to handle async errors in express if not using version 5+
    diagnoseHandler(req, res).catch(next);
});

// 2. Retrieval Step (Deterministic Logic)
app.post('/api/v1/generate/:generation_id/retrieve', (req, res, next) => {
    retrieveHandler(req, res).catch(next);
});

// 3. Drafting Step (Assembly)
app.post('/api/v1/generate/:generation_id/draft', (req, res, next) => {
    draftHandler(req, res).catch(next);
});

// 4. Export Step (DOCX)
import { exportDocxHandler } from './controllers/generateExportController';
app.post('/api/v1/generate/:generation_id/docx', (req, res, next) => {
    exportDocxHandler(req, res).catch(next);
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'rac-reasoning-core' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[GlobalErrorHandler]', err);
    res.status(500).json({ success: false, error: "Generic Server Error" });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🚀 RAC Engine (Reasoning Core) running on port ${PORT}`);
        console.log(`👉 Test Endpoint: http://localhost:${PORT}/api/v1/diagnose`);
        console.log(`🔒 Mode: Sandbox`);
    });
}

export default app;
