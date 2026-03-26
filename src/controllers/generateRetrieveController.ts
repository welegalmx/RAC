import { Request, Response } from 'express';
import { RetrievalService } from '../services/retrievalService';

const retrievalService = new RetrievalService();

export const retrieveHandler = async (req: Request, res: Response) => {
    const { generation_id } = req.params;

    if (!generation_id) {
        return res.status(400).json({ success: false, error: 'MISSING_GENERATION_ID' });
    }

    try {
        console.log(`[RetrieveController] Starting retrieval for id=${generation_id}`);

        const result = await retrievalService.getClausesForGeneration(generation_id as string);

        return res.status(200).json(result);

    } catch (error: any) {
        console.error(`[RetrieveController] Error generation_id=${generation_id}:`, error);

        // Map service errors to HTTP status
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, error: 'GENERATION_NOT_FOUND' });
        }

        // State validation errors (wrong lifecycle state for retrieve)
        if (error.message.includes('cannot run retrieve')) {
            return res.status(409).json({ // 409 Conflict: Current state conflicts with request
                success: false,
                error: 'INVALID_STATE',
                message: error.message
            });
        }

        // Logic Conflicts (Mutex)
        if (error.message.includes('MUTEX_CONFLICT') || error.message.includes('CONFLICT')) {
            return res.status(409).json({
                success: false,
                error: 'LOGIC_CONFLICT',
                message: 'Mutually exclusive clauses selected.',
                details: error.message
            });
        }

        return res.status(500).json({
            success: false,
            error: 'INTERNAL_SERVER_ERROR',
            message: 'An error occurred during clause retrieval.'
        });
    }
};
