import express from 'express';
import { protect } from '../middleware/protect.js';
import { checkRole } from '../middleware/checkRole.js';
import { 
  createOrganization, 
  getAdminStats, 
  getAdminStudents,
  addStudent,
  toggleStudentStatus,
  addTeacher,         
  getAdminTeachers,    
  getSchoolQuizResults
} from '../controllers/adminController.js';

const router = express.Router();

// ✅ SECURE: Split roles so HODs can only manage teachers, not the whole school
const ownerRoles = ['school_admin', 'super_admin'];
const teacherManagerRoles = [...ownerRoles, 'hod']; 
const dashboardRoles = [...teacherManagerRoles, 'teacher'];

router.post('/organization', protect, checkRole(ownerRoles), createOrganization); // ❌ HODs CANNOT do this
router.get('/stats', protect, checkRole(dashboardRoles), getAdminStats);
router.get('/students', protect, checkRole(ownerRoles), getAdminStudents); // ❌ HODs CANNOT do this
router.post('/add-student', protect, checkRole(ownerRoles), addStudent); // ❌ HODs CANNOT do this
router.patch('/students/:id/status', protect, checkRole(ownerRoles), toggleStudentStatus); // ❌ HODs CANNOT do this
router.post('/add-teacher', protect, checkRole(teacherManagerRoles), addTeacher); // ✅ HODs CAN do this
router.get('/teachers', protect, checkRole(teacherManagerRoles), getAdminTeachers); // ✅ HODs CAN do this
router.get('/school-results', protect, checkRole(teacherManagerRoles), getSchoolQuizResults); // ✅ HODs CAN do this

export default router;
