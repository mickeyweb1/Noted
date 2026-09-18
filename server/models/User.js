import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: [true, 'Full name is required'] },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters'] },
    role: { type: String, enum: ['student', 'school_admin', 'personal_user'], default: 'personal_user' },
    
    schoolName: { type: String, default: 'Global' }, 
    favoriteSubject: { type: String, default: '' }, 
    bio: { type: String, default: '' }, 
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    className: { type: String, default: '' },  
    phone: { type: String, default: '' },     
    isActive: { type: Boolean, default: true },
    uniqueInviteCode: { type: String, unique: true, sparse: true }, 
    
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    focusSessionsToday: { type: Number, default: 0 },
    lastFocusDate: { type: Date, default: null },
    parentInfo: { name: { type: String, default: '' }, phone: { type: String, default: '' } },
    studyStreak: { type: Number, default: 0 },
    totalFocusHours: { type: Number, default: 0 },
    
    // ✅ NEW: Track minutes spent per day (e.g., "2023-10-25": 45)
    dailyFocusLog: { type: Map, of: Number, default: {} } ,
        pendingBattles: [{
      challengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      challengerName: { type: String },
      topic: { type: String, default: 'General Knowledge' },
      questions: [{
        question: String,
        options: [String],
        correctAnswer: String,
        explanation: String
      }],
      // ✅ UPDATED: Added 'joined' and 'active' statuses
      status: { type: String, enum: ['pending', 'joined', 'active', 'completed'], default: 'pending' },
      challengerScore: { type: Number, default: 0 },
      opponentScore: { type: Number, default: 0 },
      inviteCode: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true }); // <-- Make sure this is the very last line

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);