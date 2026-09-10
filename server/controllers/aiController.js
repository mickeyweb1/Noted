import { generateWithGroq } from "../config/grok.js";
import { Content } from "../models/Content.js";
import { User } from "../models/User.js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const parseJsonObject = (rawText) => {
  if (typeof rawText !== "string" || !rawText.trim()) {
    console.error("❌ Raw text is empty or not a string:", rawText);
    throw httpError("The AI returned an empty response.", 502);
  }
  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
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
  if (!parsed || typeof parsed.title !== "string" || !parsed.title.trim() || !Array.isArray(parsed.script) || parsed.script.length < 4) {
    throw httpError("The AI returned an invalid podcast script.", 502);
  }
  const script = parsed.script.map((line) => {
    if (!line || typeof line.speaker !== "string" || typeof line.text !== "string" || !line.text.trim()) {
      throw httpError("The AI returned an invalid podcast line.", 502);
    }
    const normalizedSpeaker = line.speaker.trim().toLowerCase();
    if (normalizedSpeaker !== "leo" && normalizedSpeaker !== "dr. nova") {
      throw httpError("The AI returned an unknown podcast speaker.", 502);
    }
    return { speaker: normalizedSpeaker === "leo" ? "Leo" : "Dr. Nova", text: line.text.trim().slice(0, 1200) };
  });
  
  // Check for required structure
  const hasRequiredQuestion = script.some((line) => line.text.toLowerCase().includes("why do we actually need to know this"));
  if (script[0].speaker !== "Leo" || script[1].speaker !== "Dr. Nova" || !hasRequiredQuestion) {
    throw httpError("The AI returned an incomplete podcast structure.", 502);
  }

  return { 
    title: parsed.title.trim().slice(0, 160), 
    script,
    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
    quiz: Array.isArray(parsed.quiz) ? parsed.quiz : []
  };
};

const validateQuiz = (parsed) => {
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw httpError("The AI returned an invalid quiz.", 502);
  }
  return {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 160) : "Quiz",
    questions: parsed.questions,
  };
};

const validateVideo = (parsed) => {
  if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw httpError("The AI returned an invalid video storyboard.", 502);
  }
  return {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 160) : "Video Storyboard",
    scenes: parsed.scenes,
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
    const { text, mode, vibe, title, subject, numQuestions, difficulty, messages } = req.body || {};

    if (!ALLOWED_MODES.includes(mode)) throw httpError("Invalid generation mode.", 400);

    const inputToCheck = mode === "tutor" ? (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.content : "") : text;
    const cleanInput = ensureText(inputToCheck, "Please provide at least 5 characters.");
    if (cleanInput.length < 5) throw httpError("Please provide at least 5 characters.", 400);
    if (cleanInput.length > MAX_INPUT_LENGTH) throw httpError("Your notes are too long. Please use fewer than 50,000 characters.", 413);

    const requestedTitle = typeof title === "string" && title.trim() ? title.trim().slice(0, 160) : "";
    const cleanSubject = typeof subject === "string" && subject.trim() ? subject.trim().slice(0, 100) : "General";

    let aiTitle = requestedTitle || `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Notes`;
    let aiContent = "";

    if (mode === "tutor") {
      const tutorSystemPrompt = `You are the "Noted AI Tutor", a friendly, expert academic study assistant. STRICT RULE: EDUCATIONAL CONTENT ONLY. Answer clearly, accurately, and concisely.`;
      const safeMessages = Array.isArray(messages) ? messages.slice(-20).filter((m) => m && typeof m.content === "string" && m.content.trim()).map((m) => ({ role: m.role === "ai" || m.role === "assistant" ? "assistant" : "user", content: m.content.trim().slice(0, 10000) })) : [];
      aiContent = await runGroq([{ role: "system", content: tutorSystemPrompt }, ...safeMessages]);
      aiTitle = requestedTitle || "Tutor Chat";
    } else if (mode === "summary") {
      const systemPrompt = "You are an expert academic study assistant. Create an accurate, well-structured study summary. Educational content only.";
      const generatedTextFull = await runGroq(`${systemPrompt}\n\nNotes/Topic:\n${cleanInput}`);
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
      const tone = req.body?.tone || "engaging"; // Fix #2: Read tone
      const level = req.body?.level || "beginner"; // Fix #2: Read level
      
      if (!["short", "medium", "long"].includes(podcastLength)) throw httpError("Invalid podcast length.", 400);
      const { exchangeCount, detailLevel, maxTokens } = getPodcastInstructions(podcastLength);
      
      // Fix #1: Updated prompt to ask for keyTakeaways and quiz
      const podcastSystemPrompt = `You are a scriptwriter for a highly engaging educational podcast. 
      Tone: ${tone}. Difficulty Level: ${level}.
      There are two hosts: "Leo" (curious student) and "Dr. Nova" (expert teacher). 
      Length: ${exchangeCount}. ${detailLevel}. 
      Rules: 1. Leo opens with a surprising fact. 2. Dr. Nova introduces the topic. 3. Include a historical misconception. 4. Leo asks: "Why do we actually need to know this?" 5. Dr. Nova gives a practical answer. 6. Keep lines short. 
      7. Output VALID JSON ONLY. 
      Return exactly: { 
        "title": "Catchy title", 
        "script": [ { "speaker": "Leo", "text": "..." }, { "speaker": "Dr. Nova", "text": "..." } ],
        "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
        "quiz": [ { "question": "Q?", "options": ["A","B","C","D"], "answer": "A" } ]
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
    }else if (mode === "quiz") {
      const parsedQuestionCount = Number(numQuestions || 5);
      const questionCount = Math.min(Math.max(Number.isFinite(parsedQuestionCount) ? parsedQuestionCount : 5, 3), 15);
      const difficultyLevel = typeof difficulty === "string" && difficulty.trim() ? difficulty.trim().slice(0, 30) : "Medium";
      const quizSystemPrompt = `You are a strict academic examiner. Generate exactly ${questionCount} multiple-choice questions. Difficulty: ${difficultyLevel}. Every question must be answerable from the notes. Output VALID JSON ONLY: { "title": "Quiz title", "questions": [ { "question": "Question text", "options": ["A", "B", "C", "D"], "answer": "Correct option", "explanation": "Short explanation" } ] }`;
      const generatedTextFull = await runGroq([{ role: "system", content: quizSystemPrompt }, { role: "user", content: `Notes:\n${cleanInput}` }]);
      const parsedQuiz = validateQuiz(parseJsonObject(generatedTextFull));
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

const prepareLyricsForSpeech = (text) => {
  return text
    // Replace [Chorus], [Verse], etc. with a pause (ellipsis + newlines) instead of a space
    .replace(/\[.*?\]/g, "... \n\n") 
    .replace(/\n{3,}/g, "\n\n")
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
    const { text, style } = req.body || {};
    let cleanText = ensureText(text, "Text is required.");
    
    // Fix #4: Strip speaker labels so AI doesn't say "Leo colon..."
    if (cleanText.includes("Leo:") || cleanText.includes("Dr. Nova:")) {
      cleanText = cleanText.replace(/^(Leo|Dr\. Nova):\s*/gm, "");
    }

    if (cleanText.length > MAX_SPEECH_LENGTH) throw httpError("The audio text is too long.", 413);
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw httpError("Audio generation is not configured.", 503);
    const isRap = style === "rap";
    const speechText = isRap ? prepareLyricsForSpeech(cleanText) : cleanText;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "TxGEqnHWrfWFTfGW9XjX";
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { Accept: "audio/mpeg", "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({ text: speechText, model_id: "eleven_turbo_v2_5", voice_settings: { stability: isRap ? 0.25 : 0.5, similarity_boost: isRap ? 0.9 : 0.75, style: isRap ? 0.75 : 0, use_speaker_boost: true } }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
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

// ==========================================
// 🎬 ADVANCED VIDEO GENERATION (Background + FFmpeg)
// ==========================================

const generateSceneVisual = async (visualPrompt, aspectRatio = "16:9") => {
  const cleanPrompt = ensureText(visualPrompt, "Visual prompt is required.").slice(0, 500);
  const replicateApiKey = process.env.REPLICATE_API_TOKEN;
  
  if (replicateApiKey) {
    try {
      const enhancedPrompt = `${cleanPrompt}, high quality educational animation, smooth motion, vibrant colors, 4k resolution, masterpiece`;
      const response = await fetchWithTimeout("https://api.replicate.com/v1/models/minimax/video-01/predictions", {
        method: "POST",
        headers: { "Authorization": `Token ${replicateApiKey}`, "Content-Type": "application/json", "Prefer": "wait" },
        body: JSON.stringify({ input: { prompt: enhancedPrompt, aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9" } }),
      }, 90000);

      if (response.status === 402 || response.status === 403) throw new Error("REPLICATE_NEEDS_FUNDS");
      if (!response.ok) throw new Error("REPLICATE_FAILED");

      const data = await response.json();
      const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!videoUrl) throw new Error("REPLICATE_NO_VIDEO");

      return { videoUrl, type: "ai_video", duration: 5 };
    } catch (e) {
      if (e.message === "REPLICATE_NEEDS_FUNDS") {
        console.log("⚠️ Replicate is out of funds. Switching to FREE Pexels fallback...");
      } else {
        console.log("⚠️ Replicate failed. Switching to FREE Pexels fallback...");
      }
    }
  }

  // FREE FALLBACK: Pexels
  const pexelsApiKey = process.env.PEXELS_API_KEY;
  if (!pexelsApiKey) throw httpError("No AI credits and Pexels is not configured.", 503);

  const keywords = cleanPrompt.replace(/anime style|cartoon|4k|highly detailed|vibrant colors|professional|bright colors|soft lighting/gi, "").split(/[,\s]+/).map((w) => w.replace(/[^\w-]/g, "")).filter((w) => w.length > 2).slice(0, 5).join(" ");
  const searchQuery = encodeURIComponent(keywords || "educational animation");
  
  // Try to find a video first
  const videoResponse = await fetchWithTimeout(`https://api.pexels.com/videos/search?query=${searchQuery}&per_page=3&orientation=${aspectRatio === "9:16" ? "portrait" : "landscape"}`, { headers: { Authorization: pexelsApiKey } });
  if (videoResponse.ok) {
    const videoData = await videoResponse.json();
    if (Array.isArray(videoData.videos) && videoData.videos.length > 0) {
      const bestVideo = videoData.videos[0];
      const bestVideoFile = bestVideo.video_files.find((f) => f.quality === "hd" && f.file_type === "video/mp4") || bestVideo.video_files[0];
      console.log(`✅ Pexels Video found for scene.`);
      return { videoUrl: bestVideoFile?.link, thumbnail: bestVideo.image, duration: bestVideo.duration || 5, type: "video" };
    }
  }

  // Fallback to image if no video is found
  const imageResponse = await fetchWithTimeout(`https://api.pexels.com/v1/search?query=${searchQuery}&per_page=3&orientation=${aspectRatio === "9:16" ? "portrait" : "landscape"}`, { headers: { Authorization: pexelsApiKey } });
  if (imageResponse.ok) {
    const imageData = await imageResponse.json();
    if (Array.isArray(imageData.photos) && imageData.photos.length > 0) {
      const photoUrl = imageData.photos[0].src?.large2x || imageData.photos[0].src?.large;
      console.log(`✅ Pexels Image found for scene (will be converted to video).`);
      return { videoUrl: null, thumbnail: photoUrl, imageUrl: photoUrl, duration: 5, type: "image" };
    }
  }
  return { videoUrl: null, thumbnail: null, duration: 0, type: "none" };
};

// ==========================================
// ️ HELPER: Generate Audio for a Scene (IMPROVED)
// ==========================================
const getSceneAudio = async (narration, tempDir, index) => {
  if (!narration || !narration.trim()) {
    console.log(`⚠️ Scene ${index} has no narration, skipping audio`);
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
    console.log(`️ Generating ElevenLabs audio for Scene ${index + 1}: "${narration.substring(0, 30)}..."`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: narration,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ElevenLabs API error for scene ${index}:`, response.status, errorText);
      throw new Error(`ElevenLabs API returned ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioPath = path.join(tempDir, `audio_${index}.mp3`);
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
    console.log(`✅ Audio generated for Scene ${index + 1} (${audioBuffer.byteLength} bytes)`);
    return audioPath;
  } catch (error) {
    console.error(`❌ Failed to generate audio for scene ${index}:`, error.message);
    return null;
  }
};

const stitchVideos = async (scenesData, outputMode) => {
  if (outputMode !== "single") return null;
  const tempDir = path.join(__dirname, "../../temp_videos");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const mergedFiles = [];
  const listFile = path.join(tempDir, `list_${Date.now()}.txt`);
  const outputFile = path.join(tempDir, `final_${Date.now()}.mp4`);

  for (let i = 0; i < scenesData.length; i++) {
    const scene = scenesData[i];
    const url = scene.videoUrl || scene.imageUrl;
    if (!url) continue;

    try {
      // 1. Download the video or image
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      
      // ✅ FIX: Prevent saving HTML error pages (like 403/404 blocks)
      if (buffer.byteLength < 5000) {
        console.warn(`⚠️ Skipping scene ${i + 1}: Downloaded file is too small (likely an error page). Size: ${buffer.byteLength} bytes`);
        continue; 
      }

      const isImage = url.match(/\.(jpeg|jpg|png|webp)(\?.*)?$/i);
      const rawPath = path.join(tempDir, `raw_${i}${isImage ? '.jpg' : '.mp4'}`);
      fs.writeFileSync(rawPath, Buffer.from(buffer));

      // 2. Generate Voiceover for this scene's narration
      console.log(`🎙️ Generating voiceover for Scene ${i + 1}...`);
      const audioPath = await getSceneAudio(scene.narration, tempDir, i);

      const mergedPath = path.join(tempDir, `merged_${i}.mp4`);
      console.log(`🎬 Merging video and audio for Scene ${i + 1}...`);

      // 3. Merge Video and Audio using FFmpeg
      await new Promise((resolve, reject) => {
        const ffmpegCmd = ffmpeg(rawPath);
        
        if (isImage) {
          ffmpegCmd.inputOptions(['-loop 1']);
          if (!audioPath) {
            ffmpegCmd.duration(5);
          }
        }

        if (audioPath) {
          ffmpegCmd.input(audioPath);
        }

        const outputOpts = [
          '-c:v libx264',
          '-preset fast',
          '-crf 23',
          '-vf scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
          '-r 30',
          '-pix_fmt yuv420p',
          '-movflags +faststart'
        ];

        if (isImage && audioPath) {
          outputOpts.push('-shortest');
        }

        ffmpegCmd
          .outputOptions(outputOpts)
          .outputOptions(audioPath ? ['-map 0:v:0', '-map 1:a:0', '-c:a aac'] : ['-an'])
          .output(mergedPath)
          .on('end', () => {
            try { fs.unlinkSync(rawPath); } catch(e) {}
            if (audioPath) { try { fs.unlinkSync(audioPath); } catch(e) {} }
            resolve();
          })
          .on('error', (err) => {
            console.error(`❌ FFmpeg merge error on clip ${i}:`, err.message);
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

  if (mergedFiles.length === 0) {
    console.error("❌ No valid clips to stitch. Aborting.");
    return null;
  }

  console.log(`🔗 Stitching ${mergedFiles.length} audio-video clips together...`);
  console.log(`📂 List file contents:\n${fs.readFileSync(listFile, 'utf8')}`); // ✅ DEBUG: See exactly what FFmpeg is trying to read
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-preset fast',
        '-crf 23',
        '-pix_fmt yuv420p',
        '-movflags +faststart'
      ])
      .output(outputFile)
      // ✅ FIX: Add stderr listener to catch exactly why FFmpeg might be hanging
      .on('stderr', (stderrLine) => {
        // Only log warnings/errors, not every single frame, to keep console clean
        if (stderrLine.includes('Error') || stderrLine.includes('Warning')) {
          console.log('FFmpeg Warning:', stderrLine);
        }
      })
      .on('end', () => {
        console.log("✅ FFmpeg stitching with audio completed successfully!");
        mergedFiles.forEach(f => { try { fs.unlinkSync(f); } catch(e){} });
        try { fs.unlinkSync(listFile); } catch(e){}
        resolve(outputFile);
      })
      .on('error', (err) => {
        console.error("❌ FFmpeg stitching error:", err.message);
        reject(err);
      })
      .run();
  });
};

export const generateVideoStoryboard = async (req, res, next) => {
  try {
    const userId = requireUser(req);
    const { text, aspectRatio = "16:9", outputMode = "story" } = req.body || {};
    const cleanInput = ensureText(text, "Please provide at least 5 characters.");

    const videoSystemPrompt = `You are a video director. Turn these notes into a short educational video storyboard. CRITICAL: Output VALID JSON ONLY. No markdown or extra text. { "title": "Topic Name", "scenes": [ { "sceneNumber": 1, "narration": "Maximum 10 words.", "visualPrompt": "Maximum 10 words." } ] }`;
    const generatedTextFull = await runGroq([{ role: "system", content: videoSystemPrompt }, { role: "user", content: `Notes:\n${cleanInput}` }], { max_tokens: 500 });
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
        scenes[i] = { ...scene, ...visual, status: "completed" };
        if (visual.videoUrl || visual.imageUrl) {
          scenesForStitching.push({ videoUrl: visual.videoUrl, imageUrl: visual.imageUrl });
        }
      } catch (err) {
        scenes[i].status = "failed";
      }
      videoData.scenes = scenes;
      await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData) });
    }

    if (outputMode === "single" && scenesForStitching.length > 0) {
      try {
        const finalVideoPath = await stitchVideos(scenesForStitching, outputMode);
        if (finalVideoPath) {
          videoData.stitchedPath = finalVideoPath; 
          await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData), mediaUrl: finalVideoPath });
        }
      } catch (ffmpegErr) {
        console.error("Stitching failed, falling back to story mode:", ffmpegErr);
      }
    }
  } catch (error) {
    console.error("Background processing error:", error.message);
  }
};

export const checkVideoStatus = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) throw httpError("Video not found.", 404);
    
    const videoData = JSON.parse(content.generatedText);
    const totalScenes = videoData.scenes.length;
    const completedScenes = videoData.scenes.filter(s => s.status === "completed").length;
    
    let progress = Math.round((completedScenes / totalScenes) * 100);
    let statusMessage = "Generating scenes...";

    // ✅ CRITICAL FIX: Accurate progress during the FFmpeg stitching phase
    if (completedScenes === totalScenes) {
      if (videoData.outputMode === "single" && !content.mediaUrl) {
        progress = 95;
        statusMessage = "Stitching final video...";
      } else {
        progress = 100;
        statusMessage = "Complete!";
      }
    }

    const isFinished = completedScenes === totalScenes && (videoData.outputMode !== "single" || content.mediaUrl);

    return res.status(200).json({
      success: true,
      data: { 
        ...content.toObject(), 
        videoData, 
        progress, 
        statusMessage, // Send this to the frontendoutputMode: videoData.outputMode
        isFinished ,
outputMode: videoData.outputMode
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const regenerateScene = async (req, res, next) => {
  try {
    requireUser(req);
    const { contentId, sceneIndex } = req.body;
    const content = await Content.findById(contentId);
    if (!content) throw httpError("Video not found.", 404);
    let videoData = JSON.parse(content.generatedText);
    const scene = videoData.scenes[sceneIndex];
    if (!scene) throw httpError("Scene not found.", 404);

    const visual = await generateSceneVisual(scene.visualPrompt, videoData.aspectRatio);
    videoData.scenes[sceneIndex] = { ...scene, ...visual, status: "completed" };
    await Content.findByIdAndUpdate(contentId, { generatedText: JSON.stringify(videoData) });
    return res.status(200).json({ success: true, data: videoData.scenes[sceneIndex] });
  } catch (error) {
    return next(error);
  }
};

export const streamGeneratedVideo = async (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = path.join(__dirname, "../../temp_videos", safeFilename);
    
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Video file not found." });
    
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error("Video streaming error:", error.message);
    res.status(500).json({ error: "Failed to stream video." });
  }
};

export const generateAIVideoScene = async (req, res, next) => {
  try {
    requireUser(req);
    const { visualPrompt, sceneNumber } = req.body || {};
    const cleanPrompt = ensureText(visualPrompt, "Visual prompt is required.").slice(0, 500);
    const replicateApiKey = process.env.REPLICATE_API_TOKEN;
    
    if (replicateApiKey) {
      try {
        const enhancedPrompt = `${cleanPrompt}, high quality educational animation, smooth motion, vibrant colors, 4k resolution, masterpiece`;
        const response = await fetchWithTimeout("https://api.replicate.com/v1/models/minimax/video-01/predictions", {
          method: "POST", headers: { "Authorization": `Token ${replicateApiKey}`, "Content-Type": "application/json", "Prefer": "wait" },
          body: JSON.stringify({ input: { prompt: enhancedPrompt } }),
        }, 90000);

        if (response.status === 402 || response.status === 403) throw new Error("REPLICATE_NEEDS_FUNDS");
        if (!response.ok) throw new Error("REPLICATE_FAILED");

        const data = await response.json();
        const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
        if (!videoUrl) throw new Error("REPLICATE_NO_VIDEO");

        return res.status(200).json({ success: true, message: `AI video generated for Scene ${sceneNumber ?? ""}`.trim(), data: { videoUrl, sceneNumber: sceneNumber ?? null, thumbnail: videoUrl, duration: 5, type: "ai_video" } });
      } catch (replicateError) {
        if (replicateError.message === "REPLICATE_NEEDS_FUNDS" || replicateError.message === "REPLICATE_FAILED" || replicateError.message === "REPLICATE_NO_VIDEO") {
          console.log("🔄 Triggering FREE Pexels fallback...");
        } else {
          throw replicateError;
        }
      }
    }

    const pexelsApiKey = process.env.PEXELS_API_KEY;
    if (!pexelsApiKey) throw httpError("No AI credits and Pexels is not configured.", 503);
    const keywords = cleanPrompt.replace(/anime style|cartoon|4k|highly detailed|vibrant colors|professional|bright colors|soft lighting/gi, "").split(/[,\s]+/).map((w) => w.replace(/[^\w-]/g, "")).filter((w) => w.length > 2).slice(0, 5).join(" ");
    const searchQuery = encodeURIComponent(keywords || "educational animation");
    
    const videoResponse = await fetchWithTimeout(`https://api.pexels.com/videos/search?query=${searchQuery}&per_page=3&orientation=landscape`, { headers: { Authorization: pexelsApiKey } });
    if (videoResponse.ok) {
      const videoData = await videoResponse.json();
      if (Array.isArray(videoData.videos) && videoData.videos.length > 0) {
        const bestVideo = videoData.videos[0];
        const bestVideoFile = bestVideo.video_files.find((f) => f.quality === "hd" && f.file_type === "video/mp4") || bestVideo.video_files[0];
        return res.status(200).json({ success: true, message: `Free stock video found for Scene ${sceneNumber ?? ""}`.trim(), data: { videoUrl: bestVideoFile?.link || null, sceneNumber: sceneNumber ?? null, thumbnail: bestVideo.image || null, duration: bestVideo.duration || 5, type: "video" } });
      }
    }

    const imageResponse = await fetchWithTimeout(`https://api.pexels.com/v1/search?query=${searchQuery}&per_page=3&orientation=landscape`, { headers: { Authorization: pexelsApiKey } });
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      if (Array.isArray(imageData.photos) && imageData.photos.length > 0) {
        const photoUrl = imageData.photos[0].src?.large2x || imageData.photos[0].src?.large;
        return res.status(200).json({ success: true, message: `Free stock image found for Scene ${sceneNumber ?? ""}`.trim(), data: { videoUrl: null, sceneNumber: sceneNumber ?? null, thumbnail: photoUrl, imageUrl: photoUrl, duration: 5, type: "image" } });
      }
    }
    return res.status(200).json({ success: true, message: `No media found for Scene ${sceneNumber ?? ""}`.trim(), data: { videoUrl: null, sceneNumber: sceneNumber ?? null, thumbnail: null, duration: 0, type: "none" } });
  } catch (error) {
    console.error("Scene generation error:", error.message);
    return next(error);
  }
};