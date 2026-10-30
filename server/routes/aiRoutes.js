import express from 'express';
import rateLimit from 'express-rate-limit';
import { getUserLibrary, getSingleContent, deleteContent } from '../controllers/contentController.js';
import { saveQuizAttempt, getQuizAttempt } from '../controllers/quizController.js';
import { protect } from '../middleware/protect.js';
import { MongoRateLimitStore } from '../middleware/MongoRateLimitStore.js';
import { cancelFocusSession, completeFocusSession, startFocusSession } from '../controllers/userController.js';
import { 
  getClassmates, challengeClassmate, getMyBattles, 
  generateChallengeLink, acceptBattle, resolveBattle,
  checkBattleStatus, startBattle, markBattleReady
} from '../controllers/battleController.js';
import { 
  generateContent, 
  generateSpeech, 
  searchStockVideos,  
  extractTextFromImage,
  generateAIVideoScene,
  generateVideoStoryboard, 
  checkVideoStatus, 
  regenerateScene,
  streamGeneratedVideo,
  analyzeVibe // 🔧 NEW
} from '../controllers/aiController.js';

const router = express.Router();
const expensiveAiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `user:${req.user._id}`,
  store: new MongoRateLimitStore(),
  message: { success: false, message: 'AI media limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// AI Routes
router.get('/library', protect, getUserLibrary);
router.get('/:id', protect, getSingleContent);
router.delete('/:id', protect, deleteContent);
router.post('/generate', protect, generateContent);

// 🔧 NEW: vibe analysis for the Music Studio (does not save to the library or award XP)
router.post('/music/analyze-vibe', protect, expensiveAiLimiter, analyzeVibe);

// ✅ FIXED: Removed the extra "/ai/" so it correctly maps to /api/ai/text-to-speech
router.post('/text-to-speech', protect, expensiveAiLimiter, generateSpeech); 

router.post('/focus-session/start', protect, startFocusSession);
router.post('/focus-session/cancel', protect, cancelFocusSession);
router.post('/focus-complete', protect, completeFocusSession);
router.post('/attempt', protect, saveQuizAttempt);
router.get('/attempt/:id', protect, getQuizAttempt);

// Video Routes
router.post("/video/generate-storyboard", protect, expensiveAiLimiter, generateVideoStoryboard);
router.get("/video/status/:id", protect, checkVideoStatus);
router.post("/video/regenerate-scene", protect, expensiveAiLimiter, regenerateScene);
router.post('/video/search-stock', protect, expensiveAiLimiter, searchStockVideos);
router.post("/video/generate-scene", protect, expensiveAiLimiter, generateAIVideoScene);
router.get("/video/stream/:filename", protect, streamGeneratedVideo);

// OCR Route
router.post('/ocr/extract-text', protect, expensiveAiLimiter, extractTextFromImage);

// Battle Routes
router.get('/battle/classmates', protect, getClassmates);
router.post('/battle/challenge', protect, challengeClassmate);
router.get('/battle/pending', protect, getMyBattles);
router.post('/battle/generate-link', protect, generateChallengeLink);
router.post('/battle/accept', protect, acceptBattle);
router.get('/battle/status', protect, checkBattleStatus);
router.post('/battle/ready', protect, markBattleReady);
router.post('/battle/start', protect, startBattle);
router.post('/battle/resolve', protect, resolveBattle);

export default router;
