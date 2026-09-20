import { generateWithGroq } from "../config/grok.js";
import { Content } from "../models/Content.js";
import { User } from "../models/User.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MODES = ["summary", "video", "music", "quiz", "tutor", "podcast"];
const MAX_INPUT_LENGTH = 50000;
const MAX_SPEECH_LENGTH = 30000;
const MAX_IMAGE_PAYLOAD_LENGTH = 12000000;

const httpError = (message, status = 500) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const requireUser = (req) => {
  if (!req.user?._id) throw httpError("Not authorized.", 401);
  return req.user._id;
};

const ensureText = (value, message = "Please provide valid text.") => {
  if (typeof value !== "string") throw httpError(message, 400);
  const text = value.trim();
  if (!text) throw httpError(message, 400);
  return text;
};

// ✅ CRITICAL FIX: Auto-fix trailing commas, a common LLM JSON mistake
const parseJsonObject = (rawText) => {
  if (typeof rawText !== "string" || !rawText.trim()) {
    console.error("❌ Raw text is empty or not a string:", rawText);
    throw httpError("The AI returned an empty response.", 502);
  }
  let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error("❌ No JSON braces found. Cleaned text:", cleaned);
    throw httpError("The AI did not return valid JSON. Please try again.", 502);
  }
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch (parseError) {
    console.error("❌ JSON parse error:", parseError.message);
    throw httpError("The AI returned malformed JSON. Please try again.", 502);
  }
};

const runGroq = async (messagesOrPrompt, options = {}) => {
  try {
    return await generateWithGroq(messagesOrPrompt, options);
  } catch (error) {
    console.error("Groq generation failed:", error.message);
    throw httpError("AI generation is temporarily unavailable.", 503);
  }
};

// ✅ CRITICAL FIX: Extremely forgiving podcast validation with fallback
const validatePodcast = (parsed) => {
  if (!parsed) {
    throw httpError("The AI returned an empty response.", 502);
  }
  
  const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 160) : "Study Podcast";
  
  let script = [];
  if (Array.isArray(parsed.script)) {
    script = parsed.script
      .filter((line) => line && (typeof line.text === "string" || typeof line === "string"))
      .map((line) => {
        const text = typeof line === "string" ? line : line.text;
        const speaker = line.speaker?.toLowerCase().includes("leo") ? "Leo" : "Dr. Nova";
        return {
          speaker,
          text: text.trim().slice(0, 1200),
        };
      })
      .filter(line => line.text.length > 0);
  }
  
  // ✅ Fallback: If script is empty or too short, generate a basic one so it NEVER crashes
  if (script.length < 2) {
    script = [
      { speaker: "Leo", text: `Welcome to this study session about ${title}!` },
      { speaker: "Dr. Nova", text: `Let's explore this topic together and break it down.` }
    ];
  }

  return { 
    title,
    script,
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
    quiz: Array.isArray(parsed.quiz) ? parsed.quiz : []
  };
};

const validateQuiz = (parsed, expectedCount) => {
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw httpError("The AI returned an invalid quiz.", 502);
  }
  if (parsed.questions.length !== expectedCount) {
    throw httpError(`The AI returned ${parsed.questions.length} questions, but ${expectedCount} were requested.`, 502);
  }
  const questions = parsed.questions.map((q, index) => {
    if (
      !q ||
      typeof q.question !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some((option) => typeof option !== "string") ||
      typeof q.correctAnswer !== "string" ||
      !q.options.includes(q.correctAnswer) ||
      typeof q.explanation !== "string"
    ) {
      throw httpError(`Invalid quiz question ${index + 1}. Ensure 4 options, valid correctAnswer, and explanation.`, 502);
    }
    return q;
  });
  return {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 160) : "Quiz",
    questions,
  };
};

const validateVideo = (parsed) => {
  if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw httpError("The AI returned an invalid video storyboard.", 502);
  }
  const scenes = parsed.scenes.map((scene, index) => {
    if (
      typeof scene.narration !== "string" ||
      typeof scene.visualPrompt !== "string" ||
      !scene.narration.trim() ||
      !scene.visualPrompt.trim()
    ) {
      throw httpError(`Invalid video scene ${index + 1}.`, 502);
    }
    return {
      sceneNumber: index + 1,
      narration: scene.narration.trim().slice(0, 500),
      visualPrompt: scene.visualPrompt.trim().slice(0, 500),
    };
  });
  return {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 160) : "Video Storyboard",
    scenes,
  };
};

const getPodcastInstructions = (length) => {
  if (length === "medium") return { exchangeCount: "10 to 12 exchanges", detailLevel: "Provide deeper explanations but keep the conversational, punchy energy.", maxTokens: 1500 };
  if (length === "long") return { exchangeCount: "15 to 18 exchanges", detailLevel: "Go into deep detail, but maintain a natural and engaging conversation.", maxTokens: 2000 };
  return { exchangeCount: "6 to 8 exchanges", detailLevel: "Keep it brief, high-energy, and fast-paced.", maxTokens: 1000 };
};

export const generateContent = async (req, res, next) => {
  try {
    const userId = requireUser(req);
    const { text, mode, vibe, title, subject, numQuestions, difficulty, messages, max_tokens } = req.body || {};

    if (!ALLOWED_MODES.includes(mode)) throw httpError("Invalid generation mode.", 400);

    const inputToCheck = mode === "tutor" ? (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.content : "") : text;
    const cleanInput = ensureText(inputToCheck, "Please provide some text.");
    if (cleanInput.length < 1) throw httpError("Please provide some text.", 400);
    if (cleanInput.length > MAX_INPUT_LENGTH) throw httpError("Your notes are too long. Please use fewer than 50,000 characters.", 413);

    const requestedTitle = typeof title === "string" && title.trim() ? title.trim().slice(0, 160) : "";
    const cleanSubject = typeof subject === "string" && subject.trim() ? subject.trim().slice(0, 100) : "General";

    let aiTitle = requestedTitle || `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Notes`;
    let aiContent = "";
    
    if (mode === "tutor") {
      const tutorSystemPrompt = `You are the "Noted AI Tutor", a friendly, expert academic study assistant. 
      STRICT RULES:
      1. EDUCATIONAL CONTENT ONLY: Answer clearly, accurately, and concisely.
      2. STRICT IDENTITY: You are the Noted AI Tutor. NEVER reveal your underlying base model name.`;
      const safeMessages = Array.isArray(messages) ? messages.slice(-20).filter((m) => m && typeof m.content === "string" && m.content.trim()).map((m) => ({ role: m.role === "ai" || m.role === "assistant" ? "assistant" : "user", content: m.content.trim().slice(0, 10000) })) : [];
      aiContent = await runGroq([{ role: "system", content: tutorSystemPrompt }, ...safeMessages]);
      aiTitle = requestedTitle || "Tutor Chat";
    } else if (mode === "summary") {
      const systemPrompt = "You are an expert academic study assistant. Create an accurate, well-structured study summary. Educational content only.";
      const requestedMaxTokens = Number(max_tokens);
      const finalMaxTokens = Number.isInteger(requestedMaxTokens) ? Math.min(Math.max(requestedMaxTokens, 50), 4096) : 4096;
      
      const generatedTextFull = await runGroq(`${systemPrompt}\n\nNotes/Topic:\n${cleanInput}`, { max_tokens: finalMaxTokens });
      const lines = generatedTextFull.split("\n");
      const firstLine = lines.find((line) => line.trim().length > 0);
      if (firstLine && !firstLine.trim().startsWith("-") && !firstLine.trim().startsWith("*") && !firstLine.trim().startsWith("**") && !firstLine.trim().startsWith("📚")) {
        aiTitle = requestedTitle || firstLine.trim().replace(/^#+\s*/, "").substring(0, 160);
        aiContent = generatedTextFull.replace(firstLine, "").trim();
      } else {
        aiTitle = requestedTitle || cleanInput.substring(0, 40) + (cleanInput.length > 40 ? "..." : "");
        aiContent = generatedTextFull.trim();
      }
    } else if (mode === "video") {
      const videoSystemPrompt = `You are a video director. Turn these notes into a short educational video storyboard. CRITICAL: Output VALID JSON ONLY. No markdown or extra text. { "title": "Topic Name", "scenes": [ { "sceneNumber": 1, "narration": "Maximum 10 words.", "visualPrompt": "Maximum 10 words." } ] }`;
      const generatedTextFull = await runGroq([{ role: "system", content: videoSystemPrompt }, { role: "user", content: `Notes:\n${cleanInput}` }], { max_tokens: 500 });
      const parsedVideo = validateVideo(parseJsonObject(generatedTextFull));
      aiTitle = requestedTitle || parsedVideo.title;
      aiContent = JSON.stringify(parsedVideo);
    } else if (mode === "podcast") {
      const podcastLength = req.body?.length || "short";
      const tone = req.body?.tone || "engaging";
      const level = req.body?.level || "beginner";
      
      if (!["short", "medium", "long"].includes(podcastLength)) throw httpError("Invalid podcast length.", 400);
      const { exchangeCount, detailLevel, maxTokens } = getPodcastInstructions(podcastLength);
      
      // ✅ IMPROVED PROMPT: More explicit about JSON formatting
      const podcastSystemPrompt = `You are a scriptwriter for a highly engaging educational podcast. 
      Tone: ${tone}. Difficulty Level: ${level}.
      There are two hosts: "Leo" (curious student) and "Dr. Nova" (expert teacher). 
      Length: ${exchangeCount}. ${detailLevel}. 
      
      CRITICAL: You MUST output ONLY valid JSON. Do not include any markdown formatting like \`\`\`json. Ensure there are NO trailing commas.
      
      Format:
      {
        "title": "Catchy title",
        "script": [
          { "speaker": "Leo", "text": "Surprising fact about the topic." },
          { "speaker": "Dr. Nova", "text": "Introduction to the topic." }
        ],
        "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
        "quiz": [
          { "question": "Q?", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "Why A is correct." }
        ]
      }`;
      
      const generatedTextFull = await runGroq([{ role: "system", content: podcastSystemPrompt }, { role: "user", content: `Topic/Notes for the podcast:\n${cleanInput}` }], { max_tokens: maxTokens });
      const parsedPodcast = validatePodcast(parseJsonObject(generatedTextFull));
      aiTitle = requestedTitle || parsedPodcast.title;
      aiContent = JSON.stringify(parsedPodcast);
    } else if (mode === "music") {
      const musicVibe = vibe || "Hip-Hop and Afrobeat";
      const musicSystemPrompt = `You are a professional educational ${musicVibe} lyricist. Turn the notes into an accurate study song. 
      Structure: [Intro] 2 lines, [Verse 1] 4-6 lines, [Chorus] 4 lines, [Verse 2] 4-6 lines, [Outro] 2 lines. 
      Keep content 85% educational, 15% hype. 
      CRITICAL: Use commas (,) and ellipses (...) frequently to create natural breathing pauses for the text-to-speech engine. Keep lines to 6-10 words. Do not output markdown.`;
      aiContent = await runGroq(`${musicSystemPrompt}\n\nNotes:\n${cleanInput}`);
      aiTitle = requestedTitle || `${musicVibe} Study Track`;
    } else if (mode === "quiz") {
      const parsedQuestionCount = Number(numQuestions || 5);
      const questionCount = Math.min(Math.max(Number.isInteger(parsedQuestionCount) ? parsedQuestionCount : 5, 3), 15);
      const difficultyLevel = typeof difficulty === "string" && difficulty.trim() ? difficulty.trim().slice(0, 30) : "Medium";
      
      const quizSystemPrompt = `You are a strict academic examiner. Generate exactly ${questionCount} multiple-choice questions based on the provided notes.
Difficulty: ${difficultyLevel}
CRITICAL REQUIREMENTS:
1. Every question MUST have exactly 4 options.
2. The "correctAnswer" field MUST contain the EXACT TEXT of one of the options.
3. Every question MUST have an explanation.
4. Output VALID JSON ONLY - no markdown, no extra text.

Example format:
{
  "title": "Quiz Title",
  "questions": [
    {
      "question": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": "4",
      "explanation": "2+2 equals 4"
    }
  ]
}`;

      const generatedTextFull = await runGroq([{ role: "system", content: quizSystemPrompt }, { role: "user", content: `Notes:\n${cleanInput}` }], { max_tokens: 4096 });
      const parsedQuiz = validateQuiz(parseJsonObject(generatedTextFull), questionCount);
      aiTitle = requestedTitle || parsedQuiz.title;
      aiContent = JSON.stringify(parsedQuiz);
    }

    if (!aiContent.trim()) throw httpError("The AI returned empty content.", 502);

    const newContent = await Content.create({ userId, title: aiTitle, subject: cleanSubject, type: mode, rawText: cleanInput, generatedText: aiContent });

    const xpGained = mode === "summary" ? 10 : mode === "quiz" ? 25 : mode === "tutor" ? 5 : 15;
    try {
      const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { xp: xpGained } }, { new: true });
      if (updatedUser) {
        const newLevel = Math.floor(updatedUser.xp / 100) + 1;
        if (updatedUser.level !== newLevel) await User.findByIdAndUpdate(userId, { $set: { level: newLevel } });
        res.locals.xpGained = xpGained;
        res.locals.newLevel = newLevel;
      }
    } catch (xpError) {
      console.error("XP update failed:", xpError.message);
    }

    return res.status(201).json({ success: true, message: "Content generated!", data: newContent });
  } catch (error) {
    console.error("AI generation error:", error.message);
    return next(error);
  }
};

// ... (Keep the rest of your file exactly as it was: generateSpeech, generateSceneVisual, getSceneAudio, stitchVideos, generateVideoStoryboard, processVideoScenes, checkVideoStatus, regenerateScene, rebuildStitchedVideo, streamGeneratedVideo, generateAIVideoScene, searchStockVideos, searchStockImages, extractTextFromImage)
