import { User } from '../models/User.js';

export const getStudentDirectory = async (req, res, next) => {
  try {
    const scope = req.query.scope || 'global';
    const currentUser = req.user;

    let filter = { role: 'student' };
    const isSchoolScope = scope === 'school' && currentUser.schoolName && currentUser.schoolName !== 'Global';
    
    if (isSchoolScope) {
      filter.schoolName = currentUser.schoolName;
      // Exclude the current user from the directory list
      filter._id = { $ne: currentUser._id };
    }

    // Fetch ONLY safe, public data. NO emails, NO passwords.
    const students = await User.find(filter)
      .select('fullName xp level schoolName') 
      .sort({ xp: -1 })
      .limit(50); // Show top 50 in directory

    res.status(200).json({
      success: true,
      data: {
        students,
        userSchool: currentUser.schoolName || 'Global',
        activeScope: isSchoolScope ? 'school' : 'global'
      }
    });

  } catch (error) {
    next(error);
  }
};