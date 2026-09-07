import { generateWithGroq } from "../config/grok.js";
import { Content } from "../models/Content.js";
import { User } from "../models/User.js";

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

// ✅ FIXED: Proper triple backticks regex
const parseJsonObject = (rawText) => {
  if (typeof rawText !== "string" || !rawText.trim()) {
    console.error("❌ Raw text is empty or not a string:", rawText);
    throw httpError("The AI returned an empty response.", 502);
  }

  const cleaned = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error("❌ No JSON braces found. Cleaned text:", cleaned);
    console.error("❌ Original raw text from AI:", rawText);
    throw httpError("The AI did not return valid JSON. Please try again.", 502);
  }

  try {
    const jsonString = cleaned.slice(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);
  } catch (parseError) {
    const jsonString = cleaned.slice(firstBrace, lastBrace + 1);
    console.error("❌ JSON parse error:", parseError.message);
    console.error("❌ Malformed JSON snippet:", jsonString);
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
  const hasRequiredQuestion = script.some((line) => line.text.toLowerCase().includes("why do we actually need to know this"));
  if (script[0].speaker !== "Leo" || script[1].speaker !== "Dr. Nova" || !hasRequiredQuestion) {
    throw httpError("The AI returned an incomplete podcast structure.", 502);
  }
  return { title: parsed.title.trim().slice(0, 160), script };
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
      // ✅ FIXED: Removed weird spaces in JSON keys
      const videoSystemPrompt = `You are a video director. Turn these notes into a short educational video storyboard.
CRITICAL: Output VALID JSON ONLY. No markdown or extra text.
{
  "title": "Topic Name",
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "Maximum 10 words.",
      "visualPrompt": "Maximum 10 words."
    }
  ]
}`;
      const generatedTextFull = await runGroq(
        [{ role: "system", content: videoSystemPrompt }, { role: "user", content: `Notes:\n${cleanInput}` }],
        { max_tokens: 500 }
      );
      
      // ✅ DEBUG: Let's see exactly what the AI is returning
      console.log("🔍 RAW AI RESPONSE FOR VIDEO:", generatedTextFull);

      const parsedVideo = validateVideo(parseJsonObject(generatedTextFull));
      aiTitle = requestedTitle || parsedVideo.title;
      aiContent = JSON.stringify(parsedVideo);
    } else if (mode === "podcast") {
      const podcastLength = req.body?.length || "short";
      if (!["short", "medium", "long"].includes(podcastLength)) throw httpError("Invalid podcast length.", 400);
      const { exchangeCount, detailLevel, maxTokens } = getPodcastInstructions(podcastLength);
      
      const podcastSystemPrompt = `You are a scriptwriter for a highly engaging educational podcast.
There are two hosts:
"Leo" — a curious student. Casual, easily amazed, and energetic.
"Dr. Nova" — an expert teacher. Smart, warm, practical, and never robotic.
The podcast must contain ${exchangeCount}.
${detailLevel}
Rules:
1. Leo must open with a surprising but accurate fact.
2. Dr. Nova must naturally introduce the topic.
3. Include at least one historical misconception and correct it.
4. Leo must ask exactly: "Why do we actually need to know this?"
5. Dr. Nova must give a practical real-world answer.
6. Keep each line short: no more than 2 or 3 sentences.
7. Do not invent facts. Stay grounded in the user's notes.
8. Output VALID JSON ONLY. No markdown and no extra text.

Return exactly this structure:
{
  "title": "Catchy educational podcast title",
  "script": [
    { "speaker": "Leo", "text": "..." },
    { "speaker": "Dr. Nova", "text": "..." }
  ]
}`;
      const generatedTextFull = await runGroq(
        [{ role: "system", content: podcastSystemPrompt }, { role: "user", content: `Topic/Notes for the podcast:\n${cleanInput}` }],
        { max_tokens: maxTokens }
      );
      
      console.log("🔍 RAW AI RESPONSE FOR PODCAST:", generatedTextFull);

      const parsedPodcast = validatePodcast(parseJsonObject(generatedTextFull));
      aiTitle = requestedTitle || parsedPodcast.title;
      aiContent = JSON.stringify(parsedPodcast);
    } else if (mode === "music") {
      const musicSystemPrompt = `You are a professional educational Hip-Hop and Afrobeat lyricist. Turn the notes into an accurate study song.
Use this structure:
[Intro] 2 lines
[Verse 1] 4-6 lines
[Chorus] 4 lines
[Verse 2] 4-6 lines
[Outro] 2 lines
Keep the content 85% educational and 15% hype. Use commas for breathing pauses. Keep lines to 6-10 words. Do not output markdown.`;
      aiContent = await runGroq(`${musicSystemPrompt}\n\nNotes:\n${cleanInput}`);
      aiTitle = requestedTitle || `${vibe || "Afrobeat"} Study Track`;
    } else if (mode === "quiz") {
      const parsedQuestionCount = Number(numQuestions || 5);
      const questionCount = Math.min(Math.max(Number.isFinite(parsedQuestionCount) ? parsedQuestionCount : 5, 3), 15);
      const difficultyLevel = typeof difficulty === "string" && difficulty.trim() ? difficulty.trim().slice(0, 30) : "Medium";
      
      // ✅ FIXED: Removed weird spaces in JSON keys
      const quizSystemPrompt = `You are a strict academic examiner. Generate exactly ${questionCount} multiple-choice questions. Difficulty: ${difficultyLevel}. Every question must be answerable from the notes. Output VALID JSON ONLY with this shape:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct option",
      "explanation": "Short explanation"
    }
  ]
}`;
      const generatedTextFull = await runGroq([{ role: "system", content: quizSystemPrompt }, { role: "user", content: `Notes:\n${cleanInput}` }]);
      
      console.log("🔍 RAW AI RESPONSE FOR QUIZ:", generatedTextFull);

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

const prepareLyricsForSpeech = (text) => text.replace(/\[[^\]]*\]/g, " ").replace(/\n{2,}/g, "\n").trim();

const fetchWithTimeout = async (url, options = {}, timeoutMs = 45000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const generateSpeech = async (req, res, next) => {
  try {
    requireUser(req);
    const { text, style } = req.body || {};
    const cleanText = ensureText(text, "Text is required.");
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

// @desc Generate real AI video for a scene using Fal.ai (MiniMax/LTX)
// @route POST /ai/video/generate-scene
export const generateAIVideoScene = async (req, res, next) => {
  try {
    requireUser(req);
    const { visualPrompt, sceneNumber } = req.body || {};
    const cleanPrompt = ensureText(visualPrompt, "Visual prompt is required.").slice(0, 500);
    
    const falApiKey = process.env.FAL_API_KEY;
    if (!falApiKey) {
      throw httpError("Fal.ai video generation is not configured.", 503);
    }

    // Enhance prompt for better educational animation results
    const enhancedPrompt = `${cleanPrompt}, high quality educational animation, smooth motion, vibrant colors, 4k resolution, masterpiece`;
    
    console.log(`🎬 Generating AI video for Scene ${sceneNumber} with Fal.ai...`);

    // Using Fal.ai's MiniMax Video model (High quality, fast)
    const response = await fetchWithTimeout("https://fal.run/fal-ai/minimax/video-01", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        // Optional: You can add aspect_ratio or duration if the model supports it
      }),
    }, 90000); // ✅ 90 second timeout for video generation

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Fal.ai failed:", response.status, errorData);
      
      // Check if free trial ran out
      if (response.status === 402 || (errorData && errorData.detail && errorData.detail.includes("credit"))) {
        throw httpError("Fal.ai free trial credits have run out. Please add funds to your Fal.ai account.", 402);
      }
      throw httpError("AI video generation failed.", 503);
    }

    const data = await response.json();
    
    // Fal.ai returns the video URL in data.video.url
    const videoUrl = data.video?.url || data.url || null;

    if (!videoUrl) {
      console.error("Fal.ai response structure:", data);
      throw httpError("AI generation returned no video URL.", 502);
    }

    console.log(`✅ AI Video for Scene ${sceneNumber} generated successfully!`);
    
    return res.status(200).json({
      success: true, 
      message: `AI video generated for Scene ${sceneNumber ?? ""}`.trim(),
      data: { 
        videoUrl: videoUrl, 
        sceneNumber: sceneNumber ?? null, 
        thumbnail: videoUrl, // Use video as thumbnail too
        duration: 5, 
        type: "ai_video" 
      },
    });

  } catch (error) {
    console.error("AI video generation error:", error.message);
    return next(error);
  }
};