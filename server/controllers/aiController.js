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

// 🔧 NEW: shared constants
const MUSIC_VIBES = ["Afrobeat Rap", "Chill Lo-Fi", "Upbeat Pop", "Epic Orchestral"];
const VOICE_ID_PATTERN = /^[A-Za-z0-9]{15,30}$/;
const VIDEO_MAX_TOKENS = 900;
const VIDEO_SYSTEM_PROMPT = `You are a video director. Turn these notes into a short educational video storyboard with 4 to 6 scenes. CRITICAL: Output VALID JSON ONLY. No markdown or extra text. { "title": "Topic Name", "scenes": [ { "sceneNumber": 1, "narration": "Maximum 10 words.", "visualPrompt": "Maximum 10 words." } ] }`;

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

// 🔧 NEW: keeps user-supplied labels (vibe, tone, level) short and free of prompt-breaking characters
const cleanLabel = (value, fallback, maxLength = 40) => {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[^\w\s&+-]/g, "").trim().slice(0, maxLength);
  return cleaned || fallback;
};

const parseJsonObject = (rawText) => {
  if (typeof rawText !== "string" || !rawText.trim()) {
    console.error("❌ Raw text is empty or not a string:", rawText);
    throw httpError("The AI returned an empty response.", 502);
  }
  let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
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
        const speaker = typeof line.speaker === "string" && line.speaker.toLowerCase().includes("leo") ? "Leo" : "Dr. Nova";
        return {
          speaker,
          text: text.trim().slice(0, 1200),
        };
      })
      .filter(line => line.text.length > 0);
  }
  
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
      !scene ||
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
  if (length === "medium") return { 
    exchangeCount: "15 to 20 exchanges", 
    detailLevel: "Provide deeper explanations but keep the conversational, punchy energy.", 
    maxTokens: 2500 
  };
  if (length === "long") return { 
    exchangeCount: "20 to 25 exchanges",
    detailLevel: "Go into deep detail, but maintain a natural and engaging conversation.", 
    maxTokens: 3500 
  };
  return { 
    exchangeCount: "10 to 15 exchanges", 
    detailLevel: "Keep it brief, high-energy, and fast-paced.", 
    maxTokens: 1500 
  };
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
      2. STRICT IDENTITY: You are the Noted AI Tutor. NEVER reveal your underlying base model name.
      3. YOUNG AUDIENCE: Your users are students from primary school to high school. Keep every answer age-appropriate. Politely decline sexual, violent, self-harm, or dangerous requests and steer back to studying. If a student seems upset or unsafe, kindly encourage them to talk to a trusted adult such as a parent, teacher, or counselor.`;
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
      const generatedTextFull = await runGroq([{ role: "system", content: VIDEO_SYSTEM_PROMPT }, { role: "user", content: `Notes:\n${cleanInput}` }], { max_tokens: VIDEO_MAX_TOKENS });
      const parsedVideo = validateVideo(parseJsonObject(generatedTextFull));
      aiTitle = requestedTitle || parsedVideo.title;
      aiContent = JSON.stringify(parsedVideo);
    } else if (mode === "podcast") {
      const podcastLength = req.body?.length || "short";
      // 🔧 FIXED: sanitize user-supplied values before they go into the prompt
      const tone = cleanLabel(req.body?.tone, "engaging");
      const level = cleanLabel(req.body?.level, "beginner");
      
      if (!["short", "medium", "long"].includes(podcastLength)) throw httpError("Invalid podcast length.", 400);
      const { exchangeCount, detailLevel, maxTokens } = getPodcastInstructions(podcastLength);
      
      const podcastSystemPrompt = `You are a scriptwriter for a highly engaging educational podcast. 
      Tone: ${tone}. Difficulty Level: ${level}.
      There are two hosts: "Leo" (curious student) and "Dr. Nova" (expert teacher). 
      Length: ${exchangeCount}. ${detailLevel}. 
      
      CRITICAL: You MUST output ONLY valid JSON. Do not include any markdown formatting like \`\`\`json. Ensure there are NO trailing commas in arrays or objects.
      
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
      
      let attempts = 0;
      let parsedPodcast = null;
      let lastError = null;
      
      while (attempts < 3 && !parsedPodcast) {
        try {
          const generatedTextFull = await runGroq([{ role: "system", content: podcastSystemPrompt }, { role: "user", content: `Topic/Notes for the podcast:\n${cleanInput}` }], { max_tokens: maxTokens });
          parsedPodcast = validatePodcast(parseJsonObject(generatedTextFull));
        } catch (parseError) {
          attempts++;
          lastError = parseError;
          console.warn(`Podcast JSON parse attempt ${attempts} failed, retrying...`);
          
          if (attempts === 2) {
            const simplerPrompt = podcastSystemPrompt.replace(exchangeCount, "8 to 10 exchanges");
            try {
              const generatedTextFull = await runGroq([{ role: "system", content: simplerPrompt }, { role: "user", content: `Topic/Notes for the podcast:\n${cleanInput}` }], { max_tokens: Math.floor(maxTokens * 0.7) });
              parsedPodcast = validatePodcast(parseJsonObject(generatedTextFull));
            } catch (e) {
              lastError = e;
            }
          }
        }
      }
      
      if (!parsedPodcast) throw lastError || httpError("Failed to generate valid podcast after multiple attempts.", 502);
      
      aiTitle = requestedTitle || parsedPodcast.title;
      aiContent = JSON.stringify(parsedPodcast);
    } else if (mode === "music") {
      // 🔧 FIXED: sanitize user-supplied vibe before it goes into the prompt
      const musicVibe = cleanLabel(vibe, "Hip-Hop and Afrobeat");
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

      // 🔧 FIXED: one retry, since models often return the wrong question count or malformed JSON
      let parsedQuiz = null;
      let lastQuizError = null;
      for (let attempt = 1; attempt <= 2 && !parsedQuiz; attempt++) {
        try {
          const generatedTextFull = await runGroq([{ role: "system", content: quizSystemPrompt }, { role: "user", content: `Notes:\n${cleanInput}` }], { max_tokens: 4096 });
          parsedQuiz = validateQuiz(parseJsonObject(generatedTextFull), questionCount);
        } catch (quizError) {
          lastQuizError = quizError;
          console.warn(`Quiz generation attempt ${attempt} failed: ${quizError.message}`);
        }
      }
      if (!parsedQuiz) throw lastQuizError;
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

    // 🔧 NEW: xpGained / newLevel are now returned so the client can show level-ups
    return res.status(201).json({
      success: true,
      message: "Content generated!",
      data: newContent,
      xpGained: res.locals.xpGained ?? 0,
      newLevel: res.locals.newLevel ?? null,
    });
  } catch (error) {
    console.error("AI generation error:", error.message);
    return next(error);
  }
};

const prepareLyricsForSpeech = (text) => {
  return text
    .replace(/\[.*?\]/g, "... \n\n") 
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([.!?])\s+/g, "$1  ")
    .replace(/,\s*/g, ", ")
    .trim();
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 45000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } 
  finally { clearTimeout(timeout); }
};

export const generateSpeech = async (req, res, next) => {
  try {
    requireUser(req);
    // 🔧 REMOVED: useBrowserTTS (it did nothing on the backend; the frontend handles browser TTS)
    const { text, style, useCase, voiceId } = req.body || {};
    let cleanText = ensureText(text, "Text is required.");
    
    if (cleanText.includes("Leo:") || cleanText.includes("Dr. Nova:")) {
      cleanText = cleanText.replace(/^(Leo|Dr\. Nova):\s*/gm, "");
    }

    if (cleanText.length > MAX_SPEECH_LENGTH) throw httpError("The audio text is too long.", 413);
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw httpError("Audio generation is not configured.", 503);
    
    const isRap = style === "rap";
    const isPodcast = useCase === "podcast";
    
    const speechText = isRap ? prepareLyricsForSpeech(cleanText) : cleanText;
    
    // 🔧 FIXED: only accept a well-formed voice id from the client (it goes straight into the URL)
    const safeVoiceId = typeof voiceId === "string" && VOICE_ID_PATTERN.test(voiceId) ? voiceId : null;
    const finalVoiceId = safeVoiceId || process.env.ELEVENLABS_VOICE_ID || (isPodcast ? "21m00Tcm4TlvDq8ikWAM" : "pNInz6obpgDQGcFmaJgB");
    
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`;
    
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { Accept: "audio/mpeg", "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({ 
        text: speechText, 
        model_id: "eleven_monolingual_v1",
        voice_settings: { 
          stability: isRap ? 0.35 : isPodcast ? 0.40 : 0.45,
          similarity_boost: isRap ? 0.85 : 0.80,
          style: isRap ? 0.65 : isPodcast ? 0.50 : 0.30,
          use_speaker_boost: true,
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      // 🔧 FIXED: 429 is rate limiting, not "out of credits"
      if (response.status === 402) {
        throw httpError("ElevenLabs credits exhausted. Please switch to Browser TTS in the settings.", 402);
      }
      if (response.status === 429) {
        throw httpError("The voice service is busy. Please try again in a moment.", 429);
      }
      throw httpError(errorData?.detail?.message || "Audio generation failed.", 503);
    }
    const audioBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "private, no-store");
    return res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("ElevenLabs error:", error.message);
    return next(error);
  }
};


const generateSceneVisual = async (visualPrompt, aspectRatio = "16:9") => {
  const cleanPrompt = ensureText(visualPrompt, "Visual prompt is required.").slice(0, 500);
  const isPortrait = aspectRatio === "9:16";
  const orientation = isPortrait ? "portrait" : "landscape";
  const keywords = cleanPrompt
    .replace(/anime style|cartoon|4k|highly detailed|vibrant colors|professional|bright colors|soft lighting/gi, "")
    .split(/[,\s]+/)
    .map((word) => word.replace(/[^\w-]/g, ""))
    .filter((word) => word.length > 2)
    .slice(0, 6)
    .join(" ");

  const replicateApiKey = process.env.REPLICATE_API_TOKEN;
  if (replicateApiKey) {
    try {
      const enhancedPrompt = `${cleanPrompt}, educational animation, smooth motion, clean composition, high quality`;
      const replicateResponse = await fetchWithTimeout(
        "https://api.replicate.com/v1/models/minimax/video-01/predictions",
        {
          method: "POST",
          headers: { Authorization: `Token ${replicateApiKey}`, "Content-Type": "application/json", Prefer: "wait" },
          body: JSON.stringify({ input: { prompt: enhancedPrompt, aspect_ratio: aspectRatio } }),
        },
        120000
      );
      if (!replicateResponse.ok) throw new Error(`Replicate failed with ${replicateResponse.status}`);
      const replicateData = await replicateResponse.json();
      const generatedOutput = Array.isArray(replicateData.output) ? replicateData.output[0] : replicateData.output;
      if (typeof generatedOutput === "string" && generatedOutput.trim()) {
        return { videoUrl: generatedOutput, imageUrl: null, thumbnail: generatedOutput, duration: 5, type: "ai_video", source: "replicate" };
      }
    } catch (error) {
      console.warn("Replicate video generation failed. Falling back to Pexels:", error.message);
    }
  }

  const pexelsApiKey = process.env.PEXELS_API_KEY;
  if (!pexelsApiKey) throw httpError("Video generation is unavailable because no video provider is configured.", 503);
  
  const searchQuery = encodeURIComponent(keywords || "educational animation");
  const pexelsVideoUrl = `https://api.pexels.com/videos/search?query=${searchQuery}&per_page=10&orientation=${orientation}`;
  
  try {
    const videoResponse = await fetchWithTimeout(pexelsVideoUrl, { headers: { Authorization: pexelsApiKey } }, 30000);
    if (videoResponse.ok) {
      const videoData = await videoResponse.json();
      if (Array.isArray(videoData.videos) && videoData.videos.length > 0) {
        const sortedVideos = [...videoData.videos].sort((a, b) => {
          const aHasHd = a.video_files?.some((file) => file.quality === "hd" && file.file_type === "video/mp4");
          const bHasHd = b.video_files?.some((file) => file.quality === "hd" && file.file_type === "video/mp4");
          return Number(bHasHd) - Number(aHasHd) || (b.duration || 0) - (a.duration || 0);
        });
        const bestVideo = sortedVideos[0];
        const mp4Files = (bestVideo.video_files || []).filter((file) => file.file_type === "video/mp4");
        const selectedFile = mp4Files.find((file) => (file.height > file.width) === isPortrait) || mp4Files.find((file) => file.quality === "hd") || mp4Files[0];
        
        if (selectedFile?.link) {
          return { videoUrl: selectedFile.link, imageUrl: null, thumbnail: bestVideo.image || null, duration: bestVideo.duration || 5, type: "video", source: "pexels" };
        }
      }
    }
  } catch (error) {
    console.warn("Pexels video search failed:", error.message);
  }

  const pexelsImageUrl = `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=10&orientation=${orientation}`;
  try {
    const imageResponse = await fetchWithTimeout(pexelsImageUrl, { headers: { Authorization: pexelsApiKey } }, 30000);
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      if (Array.isArray(imageData.photos) && imageData.photos.length > 0) {
        const photo = imageData.photos[0];
        const imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.original;
        if (imageUrl) {
          return { videoUrl: null, imageUrl, thumbnail: imageUrl, duration: 5, type: "image", source: "pexels" };
        }
      }
    }
  } catch (error) {
    console.warn("Pexels image search failed:", error.message);
  }

  throw httpError("No video or image could be found for this scene.", 502);
};

const getSceneAudio = async (narration, tempDir, index) => {
  if (!narration || !narration.trim()) {
    return null;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ ELEVENLABS_API_KEY not found. Videos will be silent.");
    return null;
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "TxGEqnHWrfWFTfGW9XjX";
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { Accept: "audio/mpeg", "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({ text: narration, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true } }),
    }, 45000);

    if (!response.ok) throw new Error(`ElevenLabs API returned ${response.status}`);

    const audioBuffer = await response.arrayBuffer();
    const audioPath = path.join(tempDir, `audio_${index}.mp3`);
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
    return audioPath;
  } catch (error) {
    console.error(`❌ Failed to generate audio for scene ${index}:`, error.message);
    return null;
  }
};

const stitchVideos = async (scenesData, outputMode, aspectRatio = "16:9") => {
  if (outputMode !== "single") return null;
  
  const activeFfmpegProcesses = [];
  const jobId = crypto.randomUUID();
  const tempDir = path.join(__dirname, "../../temp_videos", jobId);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const isPortrait = aspectRatio === "9:16";
  const targetWidth = isPortrait ? 720 : 1280;
  const targetHeight = isPortrait ? 1280 : 720;
  const vfFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`;

  const mergedFiles = [];
  const listFile = path.join(tempDir, `list.txt`);
  const outputFile = path.join(tempDir, `final.mp4`);

  for (let i = 0; i < scenesData.length; i++) {
    const scene = scenesData[i];
    const url = scene.videoUrl || scene.imageUrl;
    if (!url) continue;

    try {
      const res = await fetchWithTimeout(url, {}, 30000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      
      if (buffer.byteLength < 5000) {
        console.warn(`⚠️ Skipping scene ${i + 1}: Downloaded file is too small.`);
        continue; 
      }

      const isImage = url.match(/\.(jpeg|jpg|png|webp)(\?.*)?$/i);
      const rawPath = path.join(tempDir, `raw_${i}${isImage ? '.jpg' : '.mp4'}`);
      fs.writeFileSync(rawPath, Buffer.from(buffer));

      const audioPath = await getSceneAudio(scene.narration, tempDir, i);
      const mergedPath = path.join(tempDir, `merged_${i}.mp4`);

      await new Promise((resolve, reject) => {
        const ffmpegCmd = ffmpeg(rawPath);
        activeFfmpegProcesses.push(ffmpegCmd);
        
        // NOTE: inputOptions() applies to the most recently added input, so these
        // calls must stay BEFORE the audio/silence input is added below.
        if (isImage) {
          ffmpegCmd.inputOptions(['-loop 1']);
          if (!audioPath) ffmpegCmd.duration(5);
        } else if (audioPath) {
          // 🔧 FIXED: loop short clips so narration is never cut off; -shortest ends the scene with the audio
          ffmpegCmd.inputOptions(['-stream_loop -1']);
        }

        if (audioPath) {
          ffmpegCmd.input(audioPath);
        } else {
          // 🔧 FIXED: anullsrc needs the lavfi format (fluent-ffmpeg's .input() ignores a 2nd argument)
          ffmpegCmd.input('anullsrc=channel_layout=stereo:sample_rate=44100').inputFormat('lavfi');
        }

        const outputOpts = [
          '-c:v libx264', '-preset fast', '-crf 23',
          `-vf ${vfFilter}`,
          '-r 30', '-pix_fmt yuv420p', '-movflags +faststart'
        ];

        // 🔧 FIXED: anullsrc and looped inputs are endless, so every case except
        // "image + no audio" (bounded by duration(5)) must end with -shortest.
        if (audioPath || !isImage) outputOpts.push('-shortest');

        ffmpegCmd
          .outputOptions(outputOpts)
          .outputOptions(['-map 0:v:0', '-map 1:a:0', '-c:a aac'])
          .output(mergedPath)
          .on('end', () => {
            const idx = activeFfmpegProcesses.indexOf(ffmpegCmd);
            if (idx > -1) activeFfmpegProcesses.splice(idx, 1);
            try { fs.unlinkSync(rawPath); } catch(e) {}
            if (audioPath) { try { fs.unlinkSync(audioPath); } catch(e) {} }
            resolve();
          })
          .on('error', (err) => {
            ffmpegCmd.kill('SIGKILL');
            const idx = activeFfmpegProcesses.indexOf(ffmpegCmd);
            if (idx > -1) activeFfmpegProcesses.splice(idx, 1);
            reject(err);
          })
          .run();
      });

      mergedFiles.push(mergedPath);
      fs.appendFileSync(listFile, `file '${mergedPath}'\n`);
      
    } catch (err) {
      console.error(`Failed to process clip ${i}:`, err);
    }
  }

  if (mergedFiles.length === 0) return null;

  return new Promise((resolve, reject) => {
    const finalFfmpegCmd = ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c:v libx264', '-c:a aac', '-preset fast', '-crf 23', '-pix_fmt yuv420p', '-movflags +faststart'])
      .output(outputFile);
      
    activeFfmpegProcesses.push(finalFfmpegCmd);

    finalFfmpegCmd
      .on('end', () => {
        const idx = activeFfmpegProcesses.indexOf(finalFfmpegCmd);
        if (idx > -1) activeFfmpegProcesses.splice(idx, 1);
        mergedFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e){} });
        try { fs.unlinkSync(listFile); } catch(e){}
        resolve(outputFile);
      })
      .on('error', (err) => {
        finalFfmpegCmd.kill('SIGKILL');
        const idx = activeFfmpegProcesses.indexOf(finalFfmpegCmd);
        if (idx > -1) activeFfmpegProcesses.splice(idx, 1);
        reject(err);
      })
      .run();
  });
};

export const generateVideoStoryboard = async (req, res, next) => {
  try {
    const userId = requireUser(req);
    const { text, aspectRatio: requestedAspectRatio = "16:9", outputMode: requestedOutputMode = "story" } = req.body || {};
    const aspectRatio = ["16:9", "9:16"].includes(requestedAspectRatio) ? requestedAspectRatio : "16:9";
    const outputMode = ["story", "single"].includes(requestedOutputMode) ? requestedOutputMode : "story";
    
    const cleanInput = ensureText(text, "Please provide at least 5 characters.");
    if (cleanInput.length > MAX_INPUT_LENGTH) throw httpError("Your notes are too long.", 413);

    const generatedTextFull = await runGroq([{ role: "system", content: VIDEO_SYSTEM_PROMPT }, { role: "user", content: `Notes:\n${cleanInput}` }], { max_tokens: VIDEO_MAX_TOKENS });
    const parsedVideo = validateVideo(parseJsonObject(generatedTextFull));
    
    const newContent = await Content.create({
      userId, title: parsedVideo.title, subject: "General", type: "video", rawText: cleanInput,
      generatedText: JSON.stringify({ ...parsedVideo, aspectRatio, outputMode, scenes: parsedVideo.scenes.map(s => ({ ...s, status: "pending" })) }),
      mediaUrl: null,
    });

    processVideoScenes(newContent._id.toString()).catch(err => console.error("Background video processing failed:", err));

    return res.status(201).json({ success: true, message: "Storyboard created! Generating videos in the background...", data: newContent });
  } catch (error) {
    console.error("Storyboard generation error:", error.message);
    return next(error);
  }
};

// 🔧 NEW: marks a video as failed WITHOUT wiping its scenes (checkVideoStatus needs them)
const markVideoFailed = async (contentId, message) => {
  try {
    const existing = await Content.findById(contentId);
    let previous = {};
    try { previous = JSON.parse(existing?.generatedText || "{}"); } catch { previous = {}; }
    await Content.findByIdAndUpdate(contentId, {
      generatedText: JSON.stringify({ ...previous, status: "failed", error: message }),
      mediaUrl: null,
    });
  } catch (dbErr) {
    console.error("Failed to persist video failure:", dbErr);
  }
};

const processVideoScenes = async (contentId) => {
  try {
    const content = await Content.findById(contentId);
    if (!content) return;
    let videoData = JSON.parse(content.generatedText);
    const { scenes, aspectRatio, outputMode } = videoData;
    const scenesForStitching = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      try {
        const visual = await generateSceneVisual(scene.visualPrompt, aspectRatio);
        if (!visual || (!visual.videoUrl && !visual.imageUrl)) throw new Error("No visual generated.");
        
        scenes[i] = { ...scene, ...visual, status: "completed", error: null };
        if (visual.videoUrl || visual.imageUrl) {
          scenesForStitching.push({ videoUrl: visual.videoUrl, imageUrl: visual.imageUrl, narration: scene.narration });
        }
      } catch (err) {
        console.error(`Scene ${i + 1} failed:`, err.message);
        scenes[i] = { ...scene, status: "failed", error: err.message || "Scene generation failed." };
      }
      videoData.scenes = scenes;
      await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData) });
    }

    if (outputMode === "single" && scenesForStitching.length > 0) {
      try {
        const finalVideoPath = await stitchVideos(scenesForStitching, outputMode, aspectRatio);
        if (finalVideoPath) {
          const relativePath = path.relative(path.join(__dirname, "../../"), finalVideoPath).replace(/\\/g, '/');
          videoData.stitchedPath = relativePath; 
          await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData), mediaUrl: relativePath });
        }
      } catch (ffmpegErr) {
        console.error("Stitching failed:", ffmpegErr);
        await Content.findByIdAndUpdate(contentId, { 
          generatedText: JSON.stringify({ ...videoData, status: "failed", error: "Stitching failed" }),
          mediaUrl: null 
        });
      }
    }
  } catch (error) {
    console.error("Background processing error:", error);
    await markVideoFailed(contentId, error.message || "Video processing failed");
  }
};

export const checkVideoStatus = async (req, res, next) => {
  try {
    const content = await Content.findOne({ _id: req.params.id, userId: req.user._id });
    if (!content) throw httpError("Video not found.", 404);
    
    const videoData = JSON.parse(content.generatedText);
    // 🔧 FIXED: never assume scenes exists (older failure records had none)
    const scenes = Array.isArray(videoData.scenes) ? videoData.scenes : [];
    const totalScenes = scenes.length;
    
    const finishedScenes = scenes.filter(s => ["completed", "failed"].includes(s.status)).length;
    const hasFailures = scenes.some(s => s.status === "failed");
    
    let progress = totalScenes ? Math.round((finishedScenes / totalScenes) * 100) : 0;
    let statusMessage = "Generating scenes...";
    let isFinished = false;

    if (videoData.status === "failed") {
      isFinished = true;
      progress = 100;
      statusMessage = "Failed: " + (videoData.error || "Unknown error");
    } else if (totalScenes > 0 && finishedScenes === totalScenes) {
      if (videoData.outputMode === "single" && !content.mediaUrl) {
        progress = 95;
        statusMessage = "Stitching final video...";
      } else {
        progress = 100;
        statusMessage = hasFailures ? "Completed with some errors" : "Complete!";
        isFinished = true;
      }
    }

    return res.status(200).json({
      success: true,
      data: { 
        ...content.toObject(), 
        videoData, 
        progress, 
        statusMessage,
        isFinished,
        outputMode: videoData.outputMode,
        hasFailures
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const regenerateScene = async (req, res, next) => {
  try {
    const userId = requireUser(req);
    const { contentId, sceneIndex } = req.body;
    
    if (!Number.isInteger(sceneIndex) || sceneIndex < 0) {
      throw httpError("Invalid scene index.", 400);
    }

    const content = await Content.findOne({ _id: contentId, userId });
    if (!content) throw httpError("Video not found.", 404);
    
    let videoData = JSON.parse(content.generatedText);
    const scene = videoData.scenes[sceneIndex];
    if (!scene) throw httpError("Scene not found.", 404);

    const visual = await generateSceneVisual(scene.visualPrompt, videoData.aspectRatio);
    videoData.scenes[sceneIndex] = { ...scene, ...visual, status: "completed", error: null };
    
    if (videoData.outputMode === "single") {
      videoData.status = "rebuilding"; 
      await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData), mediaUrl: null });
      rebuildStitchedVideo(contentId.toString()).catch(err => console.error("Rebuild failed:", err));
    } else {
      await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData) });
    }

    return res.status(200).json({ success: true, data: videoData.scenes[sceneIndex] });
  } catch (error) {
    return next(error);
  }
};

const rebuildStitchedVideo = async (contentId) => {
  try {
    const content = await Content.findById(contentId);
    if (!content) return;
    let videoData = JSON.parse(content.generatedText);
    const { scenes, aspectRatio, outputMode } = videoData;
    
    if (outputMode !== "single") return;

    const scenesForStitching = scenes
      .filter(s => s.status === "completed" && (s.videoUrl || s.imageUrl))
      .map(s => ({ videoUrl: s.videoUrl, imageUrl: s.imageUrl, narration: s.narration }));

    if (scenesForStitching.length > 0) {
      const finalVideoPath = await stitchVideos(scenesForStitching, outputMode, aspectRatio);
      if (finalVideoPath) {
        const relativePath = path.relative(path.join(__dirname, "../../"), finalVideoPath).replace(/\\/g, '/');
        videoData.stitchedPath = relativePath;
        videoData.status = "completed";
        await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData), mediaUrl: relativePath });
      } else {
        throw new Error("Stitching returned null");
      }
    }
  } catch (error) {
    console.error("Rebuild stitching failed:", error);
    await markVideoFailed(contentId, "Rebuild stitching failed");
  }
};

export const streamGeneratedVideo = async (req, res) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: "Not authorized." });
    
    const { filename } = req.params;
    if (!filename || !/^[a-zA-Z0-9._\-\/]+$/.test(filename) || filename.includes('..')) {
      return res.status(400).json({ error: "Invalid filename." });
    }
    
    const content = await Content.findOne({ userId: req.user._id, mediaUrl: filename });
    if (!content) return res.status(404).json({ error: "Video not found." });

    const filePath = path.join(__dirname, "../../", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Video file not found." });
    
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(filename)}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error("Video streaming error:", error.message);
    res.status(500).json({ error: "Failed to stream video." });
  }
};

export const generateAIVideoScene = async (req, res, next) => {
  try {
    requireUser(req);
    const { visualPrompt, sceneNumber, aspectRatio = "16:9" } = req.body || {};
    const visual = await generateSceneVisual(visualPrompt, aspectRatio);
    return res.status(200).json({
      success: true,
      message: `Visual generated for Scene ${sceneNumber ?? ""}`.trim(),
      data: { ...visual, sceneNumber: sceneNumber ?? null },
    });
  } catch (error) {
    console.error("Scene generation error:", error.message);
    return next(error);
  }
};

export const searchStockVideos = async (req, res, next) => {
  try {
    requireUser(req);
    const { visualPrompt, sceneNumber } = req.body || {};
    const cleanPrompt = ensureText(visualPrompt, "Visual prompt is required.").slice(0, 500);
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw httpError("Stock media search is not configured.", 503);
    const keywords = cleanPrompt.replace(/anime style|cartoon|4k|highly detailed|vibrant colors|professional|bright colors|soft lighting/gi, "").split(/[,\s]+/).map((word) => word.replace(/[^\w-]/g, "")).filter((word) => word.length > 2).slice(0, 5).join(" ");
    const searchQuery = encodeURIComponent(keywords || "educational animation");
    const url = `https://api.pexels.com/videos/search?query=${searchQuery}&per_page=5&orientation=landscape`;
    const response = await fetchWithTimeout(url, { headers: { Authorization: apiKey } });
    if (!response.ok) throw httpError("Stock video search failed.", 503);
    const data = await response.json();
    if (!Array.isArray(data.videos) || data.videos.length === 0) return searchStockImages(keywords, sceneNumber, res);
    const sortedVideos = data.videos.sort((a, b) => {
      const aHasHd = a.video_files?.some((file) => file.quality === "hd");
      const bHasHd = b.video_files?.some((file) => file.quality === "hd");
      return Number(bHasHd) - Number(aHasHd) || (b.duration || 0) - (a.duration || 0);
    });
    const bestVideo = sortedVideos[0];
    const videoFiles = bestVideo.video_files || [];
    const bestVideoFile = videoFiles.find((file) => file.quality === "hd" && file.width >= file.height && file.file_type === "video/mp4") || videoFiles.find((file) => file.width >= file.height && file.file_type === "video/mp4") || videoFiles[0];
    return res.status(200).json({
      success: true, message: `Stock video found for Scene ${sceneNumber ?? ""}`.trim(),
      data: { videoUrl: bestVideoFile?.link || null, sceneNumber: sceneNumber ?? null, thumbnail: bestVideo.image || null, duration: bestVideo.duration || 0, type: "video" },
    });
  } catch (error) {
    console.error("Stock video search error:", error.message);
    return next(error);
  }
};

const searchStockImages = async (keywords, sceneNumber, res) => {
  try {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw httpError("Stock media search is not configured.", 503);
    const searchQuery = encodeURIComponent(keywords || "educational");
    const url = `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=3&orientation=landscape`;
    const response = await fetchWithTimeout(url, { headers: { Authorization: apiKey } });
    if (!response.ok) throw httpError("Stock image search failed.", 503);
    const data = await response.json();
    if (!Array.isArray(data.photos) || data.photos.length === 0) {
      return res.status(200).json({ success: true, message: `No media found for Scene ${sceneNumber ?? ""}`.trim(), data: { videoUrl: null, sceneNumber: sceneNumber ?? null, thumbnail: null, duration: 0, type: "none" } });
    }
    const bestPhoto = data.photos[0];
    const imageUrl = bestPhoto.src?.large2x || bestPhoto.src?.large || null;
    return res.status(200).json({
      success: true, message: `Stock image found for Scene ${sceneNumber ?? ""}`.trim(),
      data: { videoUrl: null, sceneNumber: sceneNumber ?? null, thumbnail: imageUrl, imageUrl, duration: 5, type: "image" },
    });
  } catch (error) {
    console.error("Stock image search error:", error.message);
    return res.status(error.status || 503).json({ success: false, message: error.message || "Failed to find media." });
  }
};

export const extractTextFromImage = async (req, res, next) => {
  try {
    requireUser(req);
    const imageUrl = ensureText(req.body?.imageUrl, "Image data is required.");
    if (imageUrl.length > MAX_IMAGE_PAYLOAD_LENGTH) throw httpError("The image is too large to process.", 413);
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) throw httpError("OCR is not configured.", 503);
    const formData = new URLSearchParams();
    formData.append("apikey", apiKey);
    formData.append("base64Image", imageUrl);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", "2");
    const response = await fetchWithTimeout("https://api.ocr.space/parse/image", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Noted-App/1.0" }, body: formData.toString() }, 60000);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw httpError("OCR service failed.", 503);
    if (data.IsErroredOnProcessing) throw httpError(data.ErrorMessage?.[0] || "OCR could not process this image.", 422);
    const extractedText = data.ParsedResults?.[0]?.ParsedText || "";
    return res.status(200).json({ success: true, text: extractedText.trim(), message: extractedText.trim() ? "Text extracted." : "No text detected.", method: "ocr-space" });
  } catch (error) {
    console.error("OCR extraction error:", error.message);
    return next(error);
  }
};

// 🔧 NEW: lightweight vibe analysis for the Music Studio.
// Unlike /generate, this does NOT save anything to the user's library and does NOT award XP.
export const analyzeVibe = async (req, res, next) => {
  try {
    requireUser(req);
    const notes = ensureText(req.body?.text, "Please provide some notes.").slice(0, 800);

    let vibe = "";
    let reason = "";

    try {
      const raw = await runGroq(
        `Analyze these study notes and recommend the BEST music vibe for studying this content.

Choose ONE vibe from these options:
${MUSIC_VIBES.map((v) => `- ${v}`).join("\n")}

Notes: ${notes}

Answer in this exact format:
VIBE: [exact vibe name from the list above]
WHY: [one short sentence]`,
        { max_tokens: 150 }
      );

      const vibeMatch = typeof raw === "string" ? raw.match(/VIBE:\s*(.+)/i) : null;
      if (vibeMatch) {
        const rawVibe = vibeMatch[1].replace(/[*_`"'\[\]]/g, "").trim().toLowerCase();
        vibe =
          MUSIC_VIBES.find((v) => v.toLowerCase() === rawVibe) ||
          MUSIC_VIBES.find((v) => rawVibe.includes(v.toLowerCase())) ||
          "";
      }
      const whyMatch = typeof raw === "string" ? raw.match(/WHY:\s*(.+)/i) : null;
      if (whyMatch) reason = whyMatch[1].trim().slice(0, 200);
    } catch (aiError) {
      console.warn("Vibe analysis failed, using keyword fallback:", aiError.message);
    }

    if (!vibe) {
      const lower = notes.toLowerCase();
      if (/history|war|battle|important/.test(lower)) {
        vibe = "Epic Orchestral";
        reason = "Historical/important content benefits from dramatic music.";
      } else if (/science|math|formula|calculate/.test(lower)) {
        vibe = "Chill Lo-Fi";
        reason = "Technical content requires focused, calm music.";
      } else if (/motivational|energy|active/.test(lower)) {
        vibe = "Afrobeat Rap";
        reason = "Energetic content matches rhythmic beats.";
      } else {
        vibe = "Chill Lo-Fi";
        reason = "General study content works best with calm music.";
      }
    }

    return res.status(200).json({ success: true, data: { vibe, reason: reason || "Based on your notes." } });
  } catch (error) {
    console.error("Vibe analysis error:", error.message);
    return next(error);
  }
};
