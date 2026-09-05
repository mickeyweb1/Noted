import { User } from '../models/User.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    const scope = req.query.scope || 'global'; 
    const currentUser = req.user;

    // 1. Determine the filter based on scope
    let filter = { isActive: true }; // Default to active users
    
    if (scope === 'class' && currentUser.className) {
      filter.role = 'student'; // Only school students have classes
      filter.className = currentUser.className; 
    } else if (scope === 'school' && currentUser.schoolName && currentUser.schoolName !== 'Global') {
      filter.role = 'student'; // Only school students have schools
      filter.schoolName = currentUser.schoolName; 
    } else {
      // For 'global', we include both 'student' and 'personal_user'
      filter.role = { $in: ['student', 'personal_user'] };
    }

    // 2. Get the Top 30 Students sorted by highest XP
    const topUsers = await User.find(filter)
      .select('fullName xp level className schoolName role') 
      .sort({ xp: -1 }) 
      .limit(30);

    // 3. Calculate the current logged-in user's exact rank within this specific scope
    const currentUserRank = await User.countDocuments({ 
      ...filter,
      xp: { $gt: (currentUser.xp || 0) } 
    }) + 1;

    res.status(200).json({
      success: true,
      data: {
        topUsers,
        currentUserRank,
        currentXp: currentUser.xp || 0,
        currentLevel: currentUser.level || 1,
        activeScope: scope,
        userClass: currentUser.className || 'N/A',
        userSchool: currentUser.schoolName || 'Global'
      }
    });

  } catch (error) {
    next(error);
  }
};