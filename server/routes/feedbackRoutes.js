import express from 'express';
import { submitFeedback, getAllFeedback } from '../controllers/feedbackController.js';
import { protect } from '../middleware/protect.js';
import { checkRole } from '../middleware/checkRole.js';

const router = express.Router();

// Students submit feedback (must be logged in)
router.post('/', protect, submitFeedback);

// Admins view feedback (must be logged in)
router.get('/', protect, checkRole(['super_admin']), getAllFeedback);

export default router;
