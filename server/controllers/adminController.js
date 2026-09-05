import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import crypto from 'crypto'; 

// Helper to generate a unique SCHOOL code
const generateUniqueCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "NTD-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += "-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  const exists = await Organization.findOne({ inviteCode: code });
  if (exists) return generateUniqueCode();
  return code;
};

// ✅ NEW: Helper to generate a unique STUDENT code
const generateStudentCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "STU-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  code += "-";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  const exists = await User.findOne({ uniqueInviteCode: code });
  if (exists) return generateStudentCode();
  return code;
};

export const createOrganization = async (req, res, next) => {
  try {
    const { name } = req.body;
    const adminId = req.user._id;
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
    let org = await Organization.findOne({ adminId: req.user._id });
    if (!org) {
      const inviteCode = await generateUniqueCode();
      org = await Organization.create({ name: "My School", adminId: req.user._id, inviteCode });
      await User.findByIdAndUpdate(req.user._id, { schoolName: "My School", schoolId: org._id });
    }
    const totalStudents = await User.countDocuments({ schoolId: org._id, role: 'student' });
    const activeStudents = await User.countDocuments({ schoolId: org._id, role: 'student', isActive: true });
    const inactiveStudents = totalStudents - activeStudents;
    const recentStudents = await User.find({ schoolId: org._id, role: 'student' }).select('fullName className createdAt').sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        schoolName: org.name,
        inviteCode: org.inviteCode,
        stats: { totalStudents, activeStudents, inactiveStudents },
        recentStudents: recentStudents.map(s => ({ id: s._id, name: s.fullName, class: s.className || 'N/A', status: s.isActive ? 'Active' : 'Inactive', date: new Date(s.createdAt).toLocaleDateString() }))
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

export const validateInviteCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findOne({ uniqueInviteCode: code, role: 'student' }); // ✅ Check student code now
    if (!user) {
      return res.status(404).json({ success: false, message: "Invalid or expired invite code." });
    }
    res.status(200).json({ success: true, data: { schoolName: user.schoolName, schoolId: user.schoolId } });
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
    if (!org || user.schoolId.toString() !== org._id.toString()) { const error = new Error("Unauthorized"); error.status = 403; throw error; }
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

    // ✅ Generate unique code for THIS specific student
    const studentCode = await generateStudentCode();
     const tempPassword = crypto.randomBytes(6).toString('hex').toUpperCase() + '!' + crypto.randomInt(10, 99);
    
    
    const user = await User.create({
      fullName, email, password: tempPassword, role: 'student',
      schoolId: org._id, schoolName: org.name, className: className || '',
      phone: phone || '', parentInfo: parentName ? { name: parentName } : {},
      uniqueInviteCode: studentCode
    });

    res.status(201).json({ 
      success: true, 
      message: "Student added successfully. Please securely share the invite code and a temporary password with the student.",
      data: { 
        student: { fullName: user.fullName, email: user.email }, 
        studentCode 
        // tempPassword is intentionally omitted here for security
      }
    });
  } catch (error) {
    next(error);
  }
};