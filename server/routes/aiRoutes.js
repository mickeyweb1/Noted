import express from 'express';
import { getUserLibrary, getSingleContent, deleteContent } from '../controllers/contentController.js';
import { saveQuizAttempt, getQuizAttempt } from '../controllers/quizController.js';
import { protect } from '../middleware/protect.js';
import { completeFocusSession } from '../controllers/userController.js';
import { 
  getClassmates, challengeClassmate, getMyBattles, 
  generateChallengeLink, acceptBattle, resolveBattle,
  checkBattleStatus, startBattle 
} from '../controllers/battleController.js';
import { generateContent, generateSpeech, searchStockVideos } from '../controllers/aiController.js';


const router = express.Router();

// Existing AI Routes
router.get('/library', protect, getUserLibrary);
router.get('/:id', protect, getSingleContent);
router.delete('/:id', protect, deleteContent);
router.post('/generate', protect, generateContent);
router.post('/text-to-speech', protect, generateSpeech); 
router.post('/focus-complete', protect, completeFocusSession);
router.post('/attempt', protect, saveQuizAttempt);
router.get('/attempt/:id', protect, getQuizAttempt);
router.post('/video/search-stock', protect, searchStockVideos);

// ✅ Battle Routes (Updated to match new controller)
router.get('/battle/classmates', protect, getClassmates);
router.post('/battle/challenge', protect, challengeClassmate);
router.get('/battle/pending', protect, getMyBattles);
router.post('/battle/generate-link', protect, generateChallengeLink);
router.post('/battle/accept', protect, acceptBattle);
router.get('/battle/status', protect, checkBattleStatus);
router.post('/battle/start', protect, startBattle);
router.post('/battle/resolve', protect, resolveBattle);

export default router;