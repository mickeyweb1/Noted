import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: [true, 'Full name is required'] },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Password must be at least 6 characters'], select: false },
    role: { type: String, enum: ['student', 'school_admin', 'personal_user', 'teacher', 'super_admin'], default: 'personal_user' },
      claimedAt: { type: Date, default: null },
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
    revisionActivityDates: { type: [String], default: [] },
    totalFocusHours: { type: Number, default: 0 },
    dailyFocusLog: { type: Map, of: Number, default: {} },
    
    pendingBattles: [{
      challengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      opponentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      challengerName: { type: String },
      topic: { type: String, default: 'General Knowledge' },
      questions: [{
        question: String,
        options: [String],
        correctAnswer: String,
        explanation: String
      }],
      status: { type: String, enum: ['pending', 'joined', 'active', 'completed'], default: 'pending' },
      challengerScore: { type: Number, default: 0 },
      opponentScore: { type: Number, default: 0 },
      challengerAnswers: { type: [String], default: [] },
      opponentAnswers: { type: [String], default: [] },
      challengerSubmitted: { type: Boolean, default: false },
      opponentSubmitted: { type: Boolean, default: false },
      challengerReady: { type: Boolean, default: false },
      opponentReady: { type: Boolean, default: false },
      inviteCode: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],

    // ✅ NEW: Subscription & Billing Fields
    subscriptionTier: { 
        type: String, 
        enum: ['free', 'pro', 'school_owner'], 
        default: 'free' 
    },
    isSchoolOwner: { type: Boolean, default: false },
    maxTeachersAllowed: { type: Number, default: 0 }, // e.g., 4 for the base $20 plan
    currentTeachersCount: { type: Number, default: 0 },
    subscriptionStatus: { 
        type: String, 
        enum: ['active', 'canceled', 'past_due'], 
        default: 'active' 
    },
    schoolOwnerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
    } // Links a teacher to a school owner's account

}, { timestamps: true });

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
