import express from 'express';
import { protect } from '../middleware/protect.js';
import { checkRole } from '../middleware/checkRole.js';
import { 
  createOrganization, 
  getAdminStats, 
  getAdminStudents,
  addStudent,
  toggleStudentStatus
} from '../controllers/adminController.js';

const router = express.Router();

// ✅ Define the roles that are allowed to access admin routes
const allowedAdminRoles = ['school_admin', 'super_admin'];

// ✅ Pass the array of roles to checkRole
router.post('/organization', protect, checkRole(allowedAdminRoles), createOrganization);
router.get('/stats', protect, checkRole(allowedAdminRoles), getAdminStats);
router.get('/students', protect, checkRole(allowedAdminRoles), getAdminStudents);
router.post('/add-student', protect, checkRole(allowedAdminRoles), addStudent); 
router.patch('/students/:id/status', protect, checkRole(allowedAdminRoles), toggleStudentStatus);

export default router;
