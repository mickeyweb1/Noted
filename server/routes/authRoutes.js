import express from 'express';
import { 
  registerUser, 
  loginUser, 
  claimAccount, 
  validateInviteCode // ✅ Imported directly from authController
} from '../controllers/authController.js';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { protect } from '../middleware/protect.js';
import { changePassword, completeFocusSession, getMe, updateProfile } from '../controllers/userController.js'; 
import { getStudentDirectory } from '../controllers/directoryController.js';


const router = express.Router();

// Map the HTTP requests to our controller functions
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/focus-complete', protect, completeFocusSession);
router.post('/validate-code', validateInviteCode); // ✅ THIS IS THE ROUTE WE NEED
router.post('/claim', claimAccount);

router.get('/leaderboard', protect, getLeaderboard); 
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile); 
router.put('/change-password', protect, changePassword);
router.get('/directory', protect, getStudentDirectory);

// ✅ CRITICAL: This MUST be at the very bottom of the file
export default router;
