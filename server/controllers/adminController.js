import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { SCHOOL_PLAN_TIERS } from '../config/plans.js';
import crypto from 'crypto'; 
import bcrypt from 'bcryptjs';

// Helper to generate a unique SCHOOL code
const generateUniqueCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "NTD-";
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += "-";
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (!(await Organization.findOne({ inviteCode: code }))) return code;
  }
  return `NTD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

// ✅ NEW: Helper to generate a unique STUDENT code
const generateStudentCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "STU-";
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += "-";
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (!(await User.findOne({ uniqueInviteCode: code }))) return code;
  }
  return `STU-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

export const createOrganization = async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 120) {
      const error = new Error('School name must be between 1 and 120 characters.');
      error.status = 400;
      throw error;
    }

    const adminId = req.user._id;
    const existingOrganization = await Organization.findOne({ adminId });
    if (existingOrganization) {
      const error = new Error('You already have an organization.');
      error.status = 409;
      throw error;
    }

    const inviteCode = await generateUniqueCode();
    const org = await Organization.create({ name, adminId, inviteCode });
    await User.findByIdAndUpdate(adminId, { schoolName: name, schoolId: org._id });
    res.status(201).json({ success: true, data: { org, inviteCode } });
  } catch (error) {
    next(error);
  }
};

export const getAdminStats = async (req, res, next) => {
  try {
    // ✅ Check if the logged-in user is the Super Admin
    const isSuperAdmin = req.user.role === 'super_admin';
    
    let totalStudents, activeStudents, inactiveStudents, recentStudents;
    let totalTeachers, activeTeachers, inactiveTeachers, recentTeachers;
    let schoolName, inviteCode, totalPersonalUsers = 0, totalAdmins = 0;

        // ✅ NEW: Handle Teacher-specific stats
    if (req.user.role === 'teacher') {
      const teacherId = req.user._id;
      
      const totalQuizzes = await Quiz.countDocuments({ createdBy: teacherId });
      const teacherQuizzes = await Quiz.find({ createdBy: teacherId });
      const totalQuizSubmissions = await QuizSubmission.countDocuments({
        quiz: { $in: teacherQuizzes.map((quiz) => quiz._id) }
      });
      const activeGameShows = await Quiz.countDocuments({ createdBy: teacherId, gameMode: 'gameShow' });
      
      const recentQuizzes = await Quiz.find({ createdBy: teacherId })
        .select('title numberOfStudents createdAt gameMode')
        .sort({ createdAt: -1 }).limit(5);

      return res.status(200).json({
        success: true,
        data: {
          schoolName: req.user.schoolName || "My School",
          inviteCode: "N/A (Teacher Account)",
          stats: {
            totalQuizzes,
            totalQuizSubmissions,
            activeGameShows,
            isTeacher: true // ✅ Flag for the frontend
          },
          recentQuizzes: recentQuizzes.map(q => ({
            id: q._id,
            name: q.title,
            class: q.gameMode === 'gameShow' ? 'Game Show' : 'Quiz',
            status: 'Active',
            date: new Date(q.createdAt).toLocaleDateString()
          }))
        }
      });
    }

    if (isSuperAdmin) {
      // 🌍 GLOBAL STATS: Count EVERYONE in the database
      totalStudents = await User.countDocuments({ role: 'student' });
      activeStudents = await User.countDocuments({ role: 'student', isActive: true });
      inactiveStudents = totalStudents - activeStudents;
      
      // ✅ NEW: Teacher Stats for Super Admin
      totalTeachers = await User.countDocuments({ role: 'teacher' });
      activeTeachers = await User.countDocuments({ role: 'teacher', isActive: true });
      inactiveTeachers = totalTeachers - activeTeachers;

      totalPersonalUsers = await User.countDocuments({ role: 'personal_user' }); 
      totalAdmins = await User.countDocuments({ role: { $in: ['school_admin', 'super_admin'] } });
      
      recentStudents = await User.find({ role: 'student' }).select('fullName className schoolName createdAt').sort({ createdAt: -1 }).limit(5);
      recentTeachers = await User.find({ role: 'teacher' }).select('fullName schoolName createdAt').sort({ createdAt: -1 }).limit(5);
        
      schoolName = "Global Platform";
      inviteCode = "N/A (Super Admin)";
        } else {
      // 🏫 SCHOOL STATS: Handle BOTH School Admins and HODs
      let org = null;
      
      if (req.user.role === 'school_admin' || req.user.role === 'super_admin') {
        org = await Organization.findOne({ adminId: req.user._id });
      } else if (req.user.role === 'hod' || req.user.role === 'teacher') {
        // ✅ HODs and Teachers belong to a school, find it via schoolId
        org = await Organization.findOne({ _id: req.user.schoolId });
      }

      // ✅ Prevent crashes if org is somehow still not found
      if (!org) {
        return res.status(200).json({
          success: true,
          data: {
            schoolName: req.user.schoolName || "My School",
            inviteCode: "N/A",
            stats: { totalStudents: 0, activeStudents: 0, inactiveStudents: 0, totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0 },
            recentStudents: [],
            recentTeachers: []
          }
        });
      }
      
      // Student Stats
      totalStudents = await User.countDocuments({ schoolId: org._id, role: 'student' });
      activeStudents = await User.countDocuments({ schoolId: org._id, role: 'student', isActive: true });
      inactiveStudents = totalStudents - activeStudents;
      recentStudents = await User.find({ schoolId: org._id, role: 'student' }).select('fullName className createdAt').sort({ createdAt: -1 }).limit(5);

      // ✅ Teacher Stats: If HOD, only show teachers under them. If Admin, show all.
      const teacherQuery = { schoolId: org._id, role: 'teacher' };
      if (req.user.role === 'hod') {
        teacherQuery.hodId = req.user._id; // ✅ HOD only sees their department
      }

      totalTeachers = await User.countDocuments(teacherQuery);
      activeTeachers = await User.countDocuments({ ...teacherQuery, isActive: true });
      inactiveTeachers = totalTeachers - activeTeachers;
      recentTeachers = await User.find(teacherQuery).select('fullName createdAt').sort({ createdAt: -1 }).limit(5);
        
      schoolName = org.name;
      inviteCode = org.inviteCode;
    }

    res.status(200).json({
      success: true,
      data: {
        schoolName,
        inviteCode,
        stats: { 
          totalStudents, activeStudents, inactiveStudents,
          totalTeachers, activeTeachers, inactiveTeachers, // ✅ ADDED: Safe teacher stats
          totalPersonalUsers, 
          totalAdmins 
        },
        recentStudents: recentStudents.map(s => ({ 
          id: s._id, name: s.fullName, class: s.className || 'N/A', 
          school: s.schoolName || 'Personal', status: s.isActive ? 'Active' : 'Inactive', 
          date: new Date(s.createdAt).toLocaleDateString() 
        })),
        // ✅ ADDED: Recent teachers data for the new dashboard UI
        recentTeachers: recentTeachers.map(t => ({ 
          id: t._id, name: t.fullName, role: 'Teacher', 
          status: t.isActive ? 'Active' : 'Inactive', 
          date: new Date(t.createdAt).toLocaleDateString() 
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminStudents = async (req, res, next) => {
  try {
    const org = await Organization.findOne({ adminId: req.user._id });
    if (!org) return res.status(200).json({ success: true, data: { students: [] } });

    // ✅ Added uniqueInviteCode and isActive to the select list
    const students = await User.find({ schoolId: org._id, role: 'student' })
      .select('fullName email className phone parentInfo uniqueInviteCode isActive dailyFocusLog createdAt')
      .sort({ createdAt: -1 });

    const formattedStudents = students.map(s => ({
      id: s._id,
      fullName: s.fullName,
      email: s.email,
      className: s.className || 'N/A',
      phone: s.phone || 'N/A',
      parentName: s.parentInfo?.name || 'N/A',
      uniqueInviteCode: s.uniqueInviteCode || 'N/A', // ✅ Send the unique student code
      status: s.isActive ? 'active' : 'inactive',    // ✅ Use actual isActive status
      dateAdded: new Date(s.createdAt).toLocaleDateString()
    }));

    res.status(200).json({ success: true, data: { students: formattedStudents, schoolName: org.name, inviteCode: org.inviteCode } });
  } catch (error) {
    next(error);
  }
};

// ✅ FIX: Removed hardcoded 'role: student' so it validates BOTH "T-" and "STU-" codes
export const validateInviteCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    const user = await User.findOne({ uniqueInviteCode: code.trim() }); 
    
    if (!user) {
      return res.status(404).json({ success: false, message: "Invalid or expired invite code." });
    }
    
    res.status(200).json({ 
      success: true, 
      data: { schoolName: user.schoolName, schoolId: user.schoolId } 
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStudentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) { const error = new Error("Student not found"); error.status = 404; throw error; }
    const org = await Organization.findOne({ adminId: req.user._id });
    if (!org || !user.schoolId || user.schoolId.toString() !== org._id.toString()) { 
      const error = new Error("Unauthorized"); 
      error.status = 403; 
      throw error; 
    }
    user.isActive = !user.isActive;
    await user.save();
    res.status(200).json({ success: true, message: `Student ${user.isActive ? 'activated' : 'deactivated'} successfully`, data: { id: user._id, isActive: user.isActive } });
  } catch (error) {
    next(error);
  }
};

export const addStudent = async (req, res, next) => {
  try {
    const { fullName, email, className, phone, parentName } = req.body;
    let org = await Organization.findOne({ adminId: req.user._id });
    
    if (!org) {
      const inviteCode = await generateUniqueCode();
      org = await Organization.create({ name: "My School", adminId: req.user._id, inviteCode });
      await User.findByIdAndUpdate(req.user._id, { schoolName: "My School", schoolId: org._id });
    }

    // Generate unique code and temp password for THIS specific student
    const studentCode = await generateStudentCode();
    const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '!' + crypto.randomInt(10, 99);
    
    const user = await User.create({
      fullName, 
      email, 
      password: tempPassword, 
      role: 'student',
      schoolId: org._id, 
      schoolName: org.name, 
      className: className || '',
      phone: phone || '', 
      parentInfo: parentName ? { name: parentName } : {},
      uniqueInviteCode: studentCode,
      isActive: false // ✅ Start as inactive until they claim it
    });

    res.status(201).json({ 
      success: true, 
      message: "Student added successfully.",
      data: { 
        student: { fullName: user.fullName, email: user.email }, 
        studentCode,
        tempPassword // ✅ SEND THIS so the frontend can display it to the admin
      }
    });
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Helper to generate a unique TEACHER code starting with "T-"
const generateTeacherCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "T-";
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  const exists = await User.findOne({ uniqueInviteCode: code });
  if (exists) return generateTeacherCode();
  return code;
};

// ✅ NEW & FIXED: Add a Teacher to the School (with proper slot tracking)
export const addTeacher = async (req, res, next) => {
  let reserved = false;
  try {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    
    // ✅ NEW: Accept 'hod' or 'teacher' from the frontend (default to 'teacher')
    const role = req.body?.role === 'hod' ? 'hod' : 'teacher'; 
    
    if (!fullName || !email) return res.status(400).json({ success: false, message: 'Name and email are required.' });
    if (await User.exists({ email })) return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    
    const isHod = req.user.role === 'hod';
    const schoolOwnerId = isHod ? req.user.schoolOwnerId : req.user._id;
    const hodId = isHod ? req.user._id : null;

    let org = await Organization.findOne({ adminId: schoolOwnerId });
    if (!org) {
      org = await Organization.create({ 
        name: (req.user.schoolName && req.user.schoolName !== 'Global') ? req.user.schoolName : 'My School', 
        adminId: schoolOwnerId, 
        inviteCode: await generateUniqueCode() 
      });
      await User.findByIdAndUpdate(schoolOwnerId, { schoolName: org.name, schoolId: org._id });
    }
    
    const hasDevelopmentLimitBypass = req.user.role === 'school_admin' && ['development', 'test'].includes(process.env.NODE_ENV);
    
    if (req.user.role !== 'super_admin' && !hasDevelopmentLimitBypass) {
      const owner = await User.findOneAndUpdate(
        {
          _id: schoolOwnerId,
          subscriptionTier: { $in: SCHOOL_PLAN_TIERS },
          subscriptionStatus: 'active',
          $or: [{ subscriptionEndsAt: null }, { subscriptionEndsAt: { $gt: new Date() } }],
          $expr: { $lt: ['$currentTeachersCount', '$maxTeachersAllowed'] },
        },
        { $inc: { currentTeachersCount: 1 } }, 
        { new: true }
      );
      if (!owner) {
        return res.status(403).json({ success: false, message: 'An active School plan with available teacher slots is required.' });
      }
      reserved = true;
    }
    
    const teacherCode = await generateTeacherCode();
    const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '!' + crypto.randomInt(10, 99);
    
    const user = await User.create({
      fullName, 
      email, 
      password: tempPassword, 
      role: role, // ✅ NEW: Use the dynamic role ('hod' or 'teacher')
      schoolId: org._id, 
      schoolName: org.name,
      schoolOwnerId: schoolOwnerId, 
      hodId: hodId,                 // ✅ If it's a teacher, this links them to the HOD
      uniqueInviteCode: teacherCode, 
      isActive: false
    });
    
    reserved = false;
    res.status(201).json({ 
      success: true, 
      message: `${role === 'hod' ? 'Head of Department' : 'Teacher'} added successfully.`, 
      data: { 
        teacher: { fullName: user.fullName, email: user.email }, 
        teacherCode, 
        tempPassword 
      } 
    });
  } catch (error) {
    if (reserved) {
      await User.findByIdAndUpdate(schoolOwnerId, { $inc: { currentTeachersCount: -1 } }).catch(() => {});
    }
    next(error);
  }
};

export const getAdminTeachers = async (req, res, next) => {
  try {
    const isHod = req.user.role === 'hod';
    const schoolOwnerId = isHod ? req.user.schoolOwnerId : req.user._id;
    
    const org = await Organization.findOne({ adminId: schoolOwnerId });
    if (!org) return res.status(200).json({ success: true, data: { teachers: [] } });

    const query = { schoolId: org._id, role: { $in: ['teacher', 'hod'] } }; // ✅ Get both teachers and HODs
    if (isHod) {
      query.hodId = req.user._id;
    }

    const teachers = await User.find(query)
      .select('fullName email uniqueInviteCode isActive createdAt role') // ✅ Added 'role'
      .sort({ createdAt: -1 });

    const formattedTeachers = teachers.map(t => ({
      id: t._id,
      fullName: t.fullName,
      email: t.email,
      role: t.role, // ✅ Return the role
      uniqueInviteCode: t.uniqueInviteCode || 'N/A',
      status: t.isActive ? 'active' : 'inactive',
      dateAdded: new Date(t.createdAt).toLocaleDateString()
    }));

    res.status(200).json({ success: true, data: { teachers: formattedTeachers, schoolName: org.name } });
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Get ALL Quiz Results across all teachers in the school
export const getSchoolQuizResults = async (req, res, next) => {
  try {
    const isHod = req.user.role === 'hod';
    const schoolOwnerId = isHod ? req.user.schoolOwnerId : req.user._id;

    const org = await Organization.findOne({ adminId: schoolOwnerId });
    if (!org) return res.status(200).json({ success: true, data: { quizzes: [] } });

    // ✅ 1. Get teacher IDs based on who is logged in
    const query = { schoolId: org._id, role: 'teacher' };
    if (isHod) {
      query.hodId = req.user._id; // ✅ HOD only sees their department's teachers
    }
    
    const teachers = await User.find(query).select('_id fullName');
    const teacherIds = teachers.map(t => t._id);
    
    // Include the logged-in user's ID (in case the HOD/Admin creates quizzes too)
    teacherIds.push(req.user._id); 

    const quizzes = await Quiz.find({ createdBy: { $in: teacherIds } })
      .select('title difficulty numberOfStudents createdAt gameMode accessCodes createdBy')
      .populate('createdBy', 'fullName')
      .sort({ createdAt: -1 });

    const formattedQuizzes = quizzes.map(q => ({
      _id: q._id,
      title: q.title,
      difficulty: q.difficulty,
      numberOfStudents: q.numberOfStudents,
      gameMode: q.gameMode || 'test',
      createdAt: new Date(q.createdAt).toLocaleDateString(),
      teacherName: q.createdBy?.fullName || 'School Admin'
    }));

    res.status(200).json({ success: true, data: { quizzes: formattedQuizzes, schoolName: org.name } });
  } catch (error) {
    next(error);
  }
};