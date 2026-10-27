import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    subject: {
      type: String,
      default: "General",
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["summary", "video", "music", "quiz", "tutor", "podcast", "flashcards"],
      required: true,
      index: true,
    },
    rawText: {
      type: String,
      required: true,
      maxlength: 50000,
    },
    // Structured podcast, quiz, and video results are stored with JSON.stringify.
    generatedText: {
      type: String,
      default: "",
      maxlength: 150000,
    },
    mediaUrl: {
      type: String,
      default: null,
      trim: true,
    },
    revisionQuestions: [{
      questionIndex: { type: Number, required: true },
      question: { type: String, required: true },
      options: [{ type: String }],
      correctAnswer: { type: String, required: true },
      explanation: { type: String, default: '' },
      nextReviewDate: { type: Date, default: Date.now },
      interval: { type: Number, default: 0 },
      ease: { type: Number, default: 2.5 },
      repetitions: { type: Number, default: 0 },
      lastResult: { type: String, enum: ['correct', 'incorrect', null], default: null },
    }],
  },
  {
    timestamps: true,
  },
);

contentSchema.index({ userId: 1, createdAt: -1 });
contentSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Content = mongoose.model("Content", contentSchema);
