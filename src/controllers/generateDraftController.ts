import { Request, Response } from 'express';
import { DraftingService } from '../services/draftingService';

const draftingService = new DraftingService();

export const draftHandler = async (req: Request, res: Response) => {
    const { generation_id } = req.params;

    if (!generation_id) {
        return res.status(400).json({ success: false, error: 'MISSING_GENERATION_ID' });
    }

    try {
        console.log(`[DraftController] Starting drafting for id=${generation_id}`);

        const result = await draftingService.generateDraftForGeneration(generation_id as string);

        return res.status(200).json(result);

    } catch (error: any) {
        console.error(`[DraftController] Error generation_id=${generation_id}:`, error);

        // Map service errors to HTTP status
        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, error: 'GENERATION_NOT_FOUND' });
        }

        // State validation errors (e.g. not in 'ready_for_drafting')
        if (error.message.includes('not ready for drafting')) {
            return res.status(409).json({
                success: false,
                error: 'INVALID_STATE',
                message: error.message
            });
        }

        // Variable/Placeholder errors
        if (error.message.includes('Missing value')) {
            return res.status(422).json({ // 422 Unprocessable Entity
                success: false,
                error: 'DRAFTING_ERROR',
                message: 'Missing required variables for template.',
                details: error.message
            });
        }

        return res.status(500).json({
            success: false,
            error: 'INTERNAL_SERVER_ERROR',
            message: 'An error occurred during contract drafting.'
        });
    }
};
