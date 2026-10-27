import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Organization } from '../models/Organization.js';

dotenv.config();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

// Same shape for register, login and claim. Includes BOTH a nested `user` and the old flat fields,
// so existing pages keep working — and the plan fields the pricing / teacher pages need are always present.
const buildAuthResponse = (user, extra = {}) => {
  const safeUser = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    xp: user.xp || 0,
    level: user.level || 1,
    schoolId: user.schoolId || null,
    schoolName: user.schoolName || 'Global',
    subscriptionTier: user.subscriptionTier || 'free',
    subscriptionStatus: user.subscriptionStatus || 'active',
    maxTeachersAllowed: user.maxTeachersAllowed || 0,
    currentTeachersCount: user.currentTeachersCount || 0,
    schoolOwnerId: user.schoolOwnerId || null,
  };
  return { success: true, token: generateToken(user._id), user: safeUser, ...safeUser, ...extra };
};

const generateSchoolCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = 'NTD-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (!(await Organization.exists({ inviteCode: code }))) return code;
  }
  return `NTD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

const SELF_SIGNUP_ROLES = ['student', 'teacher', 'school_admin', 'personal_user'];

// @route POST /api/auth/register
export const registerUser = async (req, res, next) => {
  let reservedOwnerId = null; // teacher slot to give back if account creation fails
  try {
    const { fullName, password, role, inviteCode, className, phone, parentName, schoolName } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (typeof fullName !== 'string' || !fullName.trim()) throw httpError('Full name is required.');
    if (!email) throw httpError('A valid email is required.');
    if (typeof password !== 'string' || password.length < 6) throw httpError('Password must be at least 6 characters.');

    const finalRole = role || 'student';
    if (!SELF_SIGNUP_ROLES.includes(finalRole)) throw httpError('Invalid account type.');

    if (await User.exists({ email })) {
      throw httpError('A user with this email already exists. Please use a different email or log in.');
    }

    let schoolId = null;
    let finalSchoolName = 'Global';
    let schoolOwnerId = null;

    // Only students and teachers join an existing school with a code (a school_admin creates their own)
    const code = typeof inviteCode === 'string' ? inviteCode.trim() : '';
if (finalRole === 'teacher' && !code) {
  // Allow independent teachers to sign up without a code
  finalSchoolName = "Independent Teacher";
}

    if ((finalRole === 'student' || finalRole === 'teacher') && code) {
      const org = await Organization.findOne({ inviteCode: code });
      if (!org) throw httpError('Invalid invite code');
      schoolId = org._id;
      finalSchoolName = org.name;

      if (finalRole === 'teacher') {
        // Same limits as "Add Teacher": the owner must be on the School plan and have a free slot
        const owner = await User.findOneAndUpdate(
          { _id: org.adminId, subscriptionTier: 'school_owner', $expr: { $lt: ['$currentTeachersCount', '$maxTeachersAllowed'] } },
          { $inc: { currentTeachersCount: 1 } },
          { new: true }
        );
        if (!owner) throw httpError('This school has no free teacher slots. Please ask your school owner.', 403);
        reservedOwnerId = owner._id;
        schoolOwnerId = owner._id;
      }
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email,
      password,
      role: finalRole,
      schoolId,
      schoolName: finalSchoolName,
      schoolOwnerId,
      className: className || '',
      phone: phone || '',
      parentInfo: parentName ? { name: parentName } : {},
    });
    reservedOwnerId = null; // account exists, keep the slot

    // The school name typed on the sign-up form was being ignored. Create the school now, so the
    // first dashboard load doesn't have to (that was the slow / blank first load).
    if (finalRole === 'school_admin') {
      const name = typeof schoolName === 'string' && schoolName.trim() ? schoolName.trim().slice(0, 120) : 'My School';
      const org = await Organization.create({ name, adminId: user._id, inviteCode: await generateSchoolCode() });
      user.schoolId = org._id;
      user.schoolName = name;
      await user.save();
    }

    res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    if (reservedOwnerId) await User.findByIdAndUpdate(reservedOwnerId, { $inc: { currentTeachersCount: -1 } }).catch(() => {});
    next(error);
  }
};

// @route POST /api/auth/login
export const loginUser = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const rawPassword = req.body?.password;
    if (!email || typeof rawPassword !== 'string' || !rawPassword.trim()) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const password = rawPassword.trim();

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    // Deactivated students/teachers (and accounts not activated yet) can't log in
    if (user.isActive === false) {
      throw httpError('Your account is not active. If your school gave you an activation code, use it to activate your account. Otherwise contact your school.', 403);
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    console.error('[Auth] Login handler failed:', error.message);
    next(error);
  }
};

// @desc    Claim a pre-registered account (Student OR Teacher) with the unique code from the school
// @route   POST /api/auth/claim
export const claimAccount = async (req, res, next) => {
  try {
    const { uniqueInviteCode, password } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    if (typeof uniqueInviteCode !== 'string' || !email || typeof password !== 'string') throw httpError('Code, email and password are required.');
    if (password.length < 6) throw httpError('Password must be at least 6 characters.');

    const user = await User.findOne({ uniqueInviteCode: uniqueInviteCode.trim().toUpperCase(), email });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with this specific code and email.' });

    // Without this, anyone who knew a code + email could keep resetting that person's password
    if (user.isActive || user.claimedAt) {
      return res.status(400).json({ success: false, message: 'This account has already been activated. Please log in instead.' });
    }

    user.password = password; // hashed once by the pre-save hook
    user.isActive = true;
    user.claimedAt = new Date();
    await user.save();

    res.status(200).json(buildAuthResponse(user, { message: 'Account activated successfully!' }));
  } catch (error) {
    next(error);
  }
};

// @desc    Validate a unique invite code (Students and Teachers)
// @route   POST /api/auth/validate-code
export const validateInviteCode = async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }

    const user = await User.findOne({ uniqueInviteCode: code.trim().toUpperCase() }).select('schoolName schoolId isActive claimedAt');
    if (!user) return res.status(404).json({ success: false, message: 'Invalid or expired invite code' });
    if (user.isActive || user.claimedAt) {
      return res.status(400).json({ success: false, message: 'This code has already been used.' });
    }

    res.status(200).json({ success: true, data: { schoolName: user.schoolName, schoolId: user.schoolId } });
  } catch (error) {
    next(error);
  }
};
