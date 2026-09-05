import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    subject: { 
        type: String, 
        default: 'General' 
    },
    // What type of generation was this?
    type: { 
        type: String, 
        enum: ['summary', 'video', 'music', 'quiz', 'tutor'], 
        required: true 
    },
    // The original messy notes the user pasted
    rawText: { 
        type: String, 
        required: true 
    },
    // The clean AI-generated output
generatedText: {
  type: String,
  required: false,  // ✅ Now it's optional
  default: ""
},
    // Optional: URL to audio/video file if we generate media later via Cloudinary
    mediaUrl: { 
        type: String, 
        default: null 
    }
}, { 
    timestamps: true // Adds createdAt and updatedAt automatically
});

export const Content = mongoose.model('Content', contentSchema);