import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { FocusSession } from '../models/FocusSession.js';

export const startFocusSession = async (req, res, next) => {
  try {
    const durationMinutes = Number(req.body?.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) {
      return res.status(400).json({ success: false, message: 'Focus duration must be between 1 and 180 minutes.' });
    }

    await FocusSession.updateMany(
      { userId: req.user._id, status: 'active' },
      { $set: { status: 'cancelled' } },
    );
    const session = await FocusSession.create({ userId: req.user._id, durationMinutes });
    res.status(201).json({ success: true, data: { sessionId: session._id, durationMinutes } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A focus session is already starting. Please try again.' });
    }
    next(error);
  }
};

export const cancelFocusSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body || {};
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: 'A valid focus session ID is required.' });
    }
    const session = await FocusSession.findOneAndUpdate(
      { _id: sessionId, userId: req.user._id, status: 'active' },
      { $set: { status: 'cancelled' } },
      { new: true },
    );
    if (!session) return res.status(404).json({ success: false, message: 'Active focus session not found.' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const completeFocusSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body || {};
    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: 'A valid focus session ID is required.' });
    }
    const now = new Date();
    const completion = await mongoose.connection.transaction(async (transaction) => {
      const session = await FocusSession.findOne({ _id: sessionId, userId: req.user._id, status: 'active' }).session(transaction);
      if (!session) return { error: 'inactive' };

      const minimumEnd = new Date(session.startedAt.getTime() + session.durationMinutes * 60_000);
      if (now < minimumEnd) return { error: 'early' };

      const claimed = await FocusSession.findOneAndUpdate(
        { _id: session._id, userId: req.user._id, status: 'active', startedAt: { $lte: new Date(now.getTime() - session.durationMinutes * 60_000) } },
        { $set: { status: 'completed', completedAt: now } },
        { new: true, session: transaction },
      );
      if (!claimed) return { error: 'inactive' };

      const user = await User.findById(req.user._id).session(transaction);
      if (!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
      }

      const today = now.toISOString().split('T')[0];
      const lastFocus = user.lastFocusDate ? new Date(user.lastFocusDate).toISOString().split('T')[0] : null;
      if (lastFocus !== today) {
        user.focusSessionsToday = 1;
        user.lastFocusDate = now;
      } else {
        user.focusSessionsToday += 1;
      }

      const currentDailyMinutes = user.dailyFocusLog.get(today) || 0;
      user.dailyFocusLog.set(today, currentDailyMinutes + claimed.durationMinutes);
      user.totalFocusHours = (user.totalFocusHours || 0) + (claimed.durationMinutes / 60);
      user.xp += 15;
      user.level = Math.floor(user.xp / 100) + 1;
      await user.save({ session: transaction });

      return { user, today };
    });

    if (completion.error === 'early') {
      return res.status(400).json({ success: false, message: 'Focus session is not complete yet.' });
    }
    if (completion.error === 'inactive') {
      return res.status(409).json({ success: false, message: 'This focus session is no longer active.' });
    }
    const { user, today } = completion;

    res.status(200).json({
      success: true,
      message: 'Focus session completed! +15 XP awarded.',
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
    const { firstName, lastName, fullName, email, phone, schoolName, favoriteSubject, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      const error = new Error("User not found");
      error.status = 404; 
      throw error;
    }

    // ✅ SAVE ALL FIELDS (not just school/bio)
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (fullName !== undefined) user.fullName = fullName; // ✅ THIS WAS MISSING!
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
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
