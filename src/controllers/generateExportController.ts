import { Request, Response } from 'express';
import { DocxExportService } from '../services/docxExportService';

const docxService = new DocxExportService();

export const exportDocxHandler = async (req: Request, res: Response) => {
    const generation_id = req.params.generation_id as string;

    try {
        const result = await docxService.generateDocx(generation_id);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[DocxHandler] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || "DOCX_EXPORT_ERROR"
        });
    }
};
