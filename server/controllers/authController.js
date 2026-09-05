import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Organization } from '../models/Organization.js';

dotenv.config();

// ✅ ADD THIS HELPER FUNCTION HERE
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export const registerUser = async (req, res, next) => {
    try {
        const { fullName, email, password, role, inviteCode, className, phone, parentName } = req.body;

        // 1. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            const error = new Error('A user with this email already exists. Please use a different email or log in.');
            error.status = 400; 
            throw error;
        }

        let schoolId = null;
        let schoolName = 'Global';

        // 2. SAFE INVITE CODE CHECK: Only run this if the user is actually a student
        if (role === 'student' && inviteCode && inviteCode.trim() !== '') {
            const org = await Organization.findOne({ inviteCode: inviteCode.trim(), isActive: true });
            if (org) {
                schoolId = org._id;
                schoolName = org.name;
            } else {
                const error = new Error('Invalid invite code');
                error.status = 400; 
                throw error;
            }
        }

        // 3. Create the user
        const user = await User.create({
            fullName,
            email,
            password,
            role: role || 'student',
            schoolId,
            schoolName,
            className: className || '',
            phone: phone || '',
            parentInfo: parentName ? { name: parentName } : {}
        });

        if (user) {
            res.status(201).json({
                success: true,
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                xp: user.xp || 0,
                level: user.level || 1,
                schoolName: user.schoolName,
                token: generateToken(user._id) // ✅ Now this will work perfectly!
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Find the user by email
        const user = await User.findOne({ email });

        // 2. Check if user exists AND if the password matches
        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                xp: user.xp || 0,       
                level: user.level || 1,
                schoolId: user.schoolId,
                schoolName: user.schoolName || 'Global',
                token: generateToken(user._id) // ✅ Using the helper here too
            });
        } else {
            const error = new Error('Invalid email or password');
            error.status = 401;
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Claim a pre-registered student account using their unique code
// @route   POST /api/auth/claim
export const claimAccount = async (req, res, next) => {
  try {
    const { uniqueInviteCode, email, password, fullName } = req.body;

    // If fullName is provided (from the new form), update it
    const updateData = { password };
    if (fullName) updateData.fullName = fullName;

    const user = await User.findOne({ 
      uniqueInviteCode: uniqueInviteCode.trim(), 
      email: email.toLowerCase().trim(), 
      role: 'student' 
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this specific code and email." });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "This account has been deactivated by your administrator." });
    }

    // Update user fields
    Object.assign(user, updateData);
    user.isActive = true;
    await user.save();

    const token = generateToken(user._id); // ✅ Using the helper here too

    res.status(200).json({
      success: true, 
      message: "Account activated successfully!", 
      token,
      user: { 
          _id: user._id, 
          fullName: user.fullName, 
          email: user.email, 
          role: user.role, 
          xp: user.xp || 0, 
          level: user.level || 1, 
          schoolName: user.schoolName 
      }
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Validate a student's unique invite code
// @route   POST /api/auth/validate-code
export const validateInviteCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    // ✅ FIX: Check the User model for the uniqueInviteCode, not the Organization model
    const user = await User.findOne({ 
      uniqueInviteCode: code.trim(), 
      role: 'student' 
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Invalid or expired invite code" });
    }

    res.status(200).json({
      success: true,
      data: { schoolName: user.schoolName }
    });
  } catch (error) {
    next(error);
  }
};