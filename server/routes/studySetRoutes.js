import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/protect.js';
import {
  createStudySetFromText,
  createStudySetFromUpload,
  getStudySet,
  listStudySets,
  reviewStudySetCard,
  sendStudySetTutorMessage,
} from '../controllers/studySetController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2, fieldSize: 1024, parts: 3 },
});
const receiveUpload = (req, res, next) => upload.single('file')(req, res, (error) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Files must be 8 MB or smaller.' });
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: 'The upload request is invalid.' });
  }
  if (error) return next(error);
  return next();
});

router.use(protect);
router.get('/', listStudySets);
router.post('/', createStudySetFromText);
router.post('/upload', receiveUpload, createStudySetFromUpload);
router.post('/:id/tutor', sendStudySetTutorMessage);
router.post('/:id/cards/:cardId/review', reviewStudySetCard);
router.get('/:id', getStudySet);

export default router;
