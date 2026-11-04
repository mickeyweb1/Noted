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

const schoolManagementRoles = ['school_admin', 'super_admin', 'hod'];
const dashboardRoles = [...schoolManagementRoles, 'teacher'];

router.post('/organization', protect, checkRole(schoolManagementRoles), createOrganization);
router.get('/stats', protect, checkRole(dashboardRoles), getAdminStats);
router.get('/students', protect, checkRole(schoolManagementRoles), getAdminStudents);
router.post('/add-student', protect, checkRole(schoolManagementRoles), addStudent);
router.patch('/students/:id/status', protect, checkRole(schoolManagementRoles), toggleStudentStatus);
router.post('/add-teacher', protect, checkRole(schoolManagementRoles), addTeacher);
router.get('/teachers', protect, checkRole(schoolManagementRoles), getAdminTeachers);

router.get('/school-results', protect, checkRole(schoolManagementRoles), getSchoolQuizResults);


export default router;
