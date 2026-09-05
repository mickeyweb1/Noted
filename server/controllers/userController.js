import { User } from '../models/User.js';

// @desc    Complete a focus session and award XP
// @route   POST /api/ai/focus-complete
export const completeFocusSession = async (req, res, next) => {
  try {
    const { durationMinutes } = req.body; // ✅ Get duration from frontend
    const user = await User.findById(req.user._id);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404; throw error;
    }

    const today = new Date().toISOString().split('T')[0]; // Format: "YYYY-MM-DD"
    const lastFocus = user.lastFocusDate ? new Date(user.lastFocusDate).toISOString().split('T')[0] : null;

    if (lastFocus !== today) {
      user.focusSessionsToday = 1;
      user.lastFocusDate = new Date();
    } else {
      user.focusSessionsToday += 1;
    }

    // ✅ Update daily focus log
    const currentDailyMinutes = user.dailyFocusLog.get(today) || 0;
    user.dailyFocusLog.set(today, currentDailyMinutes + Number(durationMinutes));
    
    // ✅ Update total focus hours
    user.totalFocusHours = (user.totalFocusHours || 0) + (Number(durationMinutes) / 60);

    user.xp += 15;
    user.level = Math.floor(user.xp / 100) + 1;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: "Focus session completed! +15 XP awarded.",
      data: {
        xp: user.xp,
        level: user.level,
        focusSessionsToday: user.focusSessionsToday,
        dailyMinutes: user.dailyFocusLog.get(today)
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { schoolName, favoriteSubject, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      const error = new Error("User not found");
      error.status = 404; throw error;
    }

    if (schoolName !== undefined) user.schoolName = schoolName;
    if (favoriteSubject !== undefined) user.favoriteSubject = favoriteSubject;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully!",
      data: user 
    });

  } catch (error) {
    next(error);
  }
};