import express from 'express';
import { protect } from '../middleware/protect.js';
import { checkRole } from '../middleware/checkRole.js'; // ✅ ADDED
import { 
  createOrganization, 
  getAdminStats, 
  getAdminStudents,
  addStudent,
  toggleStudentStatus
} from '../controllers/adminController.js';

const router = express.Router();

// ✅ SECURE: Added checkRole('school_admin') to EVERY route
router.post('/organization', protect, checkRole('school_admin'), createOrganization);
router.get('/stats', protect, checkRole('school_admin'), getAdminStats);
router.get('/students', protect, checkRole('school_admin'), getAdminStudents);
router.post('/add-student', protect, checkRole('school_admin'), addStudent); 
router.patch('/students/:id/status', protect, checkRole('school_admin'), toggleStudentStatus);

export default router;