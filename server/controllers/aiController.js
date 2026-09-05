import { generateWithGroq } from '../config/grok.js';
import { Content } from '../models/Content.js';
import { User } from '../models/User.js'; 

export const generateContent = async (req, res, next) => {
  try {
    const { text, mode, vibe, title, subject, numQuestions, difficulty, messages } = req.body;

    if (!req.user?._id) {
      const error = new Error("Not authorized.");
      error.status = 401; throw error;
    }
    const userId = req.user._id;

    const inputToCheck = mode === 'tutor' 
      ? (messages && messages.length > 0 ? messages[messages.length - 1].content : "") 
      : text;

    if (!inputToCheck || inputToCheck.trim().length < 5) {
      const error = new Error("Please provide at least 5 characters.");
      error.status = 400; throw error;
    }

    let aiTitle = title || `${mode.charAt(0).toUpperCase() + mode.slice(1)} Notes`;
    let aiContent = "";

    if (mode === 'tutor') {
      const tutorSystemPrompt = `You are the "Noted AI Tutor", a friendly, expert academic study assistant. 
STRICT RULE: EDUCATIONAL CONTENT ONLY. Answer clearly and concisely.`;
      const groqMessages = [
        { role: "system", content: tutorSystemPrompt },
        ...(Array.isArray(messages) ? messages.map(m => ({
          role: (m.role === "ai" || m.role === "assistant") ? "assistant" : "user",
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        })) : [])
      ];
      try { aiContent = await generateWithGroq(groqMessages); } 
      catch (groqError) { throw new Error("AI service is temporarily unavailable."); }
      aiTitle = title || 'Tutor Chat';

    } else if (mode === 'summary') {
      const systemPrompt = `You are an expert academic study assistant. STRICT RULE: EDUCATIONAL CONTENT ONLY.`;
      const generatedTextFull = await generateWithGroq(`${systemPrompt}\n\nNotes/Topic:\n${text}`);
      const lines = generatedTextFull.split('\n');
      const firstLine = lines.find(line => line.trim().length > 0);
      if (firstLine && !firstLine.startsWith('-') && !firstLine.startsWith('*') && !firstLine.startsWith('**') && !firstLine.startsWith('📚')) {
        aiTitle = firstLine.trim().substring(0, 60);
        aiContent = generatedTextFull.replace(firstLine, '').trim();
      } else {
        aiTitle = title || text.substring(0, 40) + (text.length > 40 ? "..." : "");
        aiContent = generatedTextFull;
      }

    } else if (mode === 'video') {
      const videoSystemPrompt = `You are a video director. Turn these notes into a 2-scene animated video script.
CRITICAL: Output VALID JSON ONLY. No markdown, no extra text. Keep it extremely brief.
{
  "title": "Topic Name",
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "Max 10 words.",
      "visualPrompt": "Max 10 words."
    }
  ]
}`;

      const groqMessages = [
        { role: "system", content: videoSystemPrompt },
        { role: "user", content: `Notes:\n${text}` }
      ];
      
      // ✅ STRICT LIMIT to prevent 429 OTPM errors
      const generatedTextFull = await generateWithGroq(groqMessages, { max_tokens: 500 });
      
      console.log("🎬 RAW AI VIDEO OUTPUT:", generatedTextFull);
      
      try {
        let cleanJson = generatedTextFull.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBracket = cleanJson.indexOf('{');
        const lastBracket = cleanJson.lastIndexOf('}');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          const jsonString = cleanJson.substring(firstBracket, lastBracket + 1);
          const parsed = JSON.parse(jsonString);
          
          if (parsed && Array.isArray(parsed.scenes)) {
            aiTitle = parsed.title || title || "Video Storyboard";
            aiContent = generatedTextFull; 
          } else { 
            throw new Error("Missing scenes array in parsed JSON"); 
          }
        } else { 
          throw new Error(`No JSON brackets found.`); 
        }
      } catch (e) {
        console.error("❌ Video JSON parse error:", e.message);
        aiContent = generatedTextFull;
        aiTitle = title || "Video (Parse Failed)";
      }} else if (mode === 'music') { // ✅ FIXED: Now properly outside the try/catch block
      const musicSystemPrompt = `You are a professional Hip-Hop and Afrobeat lyricist. Turn the following educational notes into a hard-hitting, rhythmic rap song.

TOPIC FOCUS: 85% strict educational content based on the provided notes, 15% hype/filler (e.g., "let's go", "study hard", "we got the flow").

CRITICAL STRUCTURE:
[Intro] (2 lines of hype, setting the beat)
[Verse 1] (4-6 lines, explaining the first concept with strong end-rhymes)
[Chorus] (4 lines, catchy, repetitive, summarizing the main topic)
[Verse 2] (4-6 lines, explaining the second concept with strong end-rhymes)
[Outro] (2 lines of hype, fading out)

RHYTHM & TTS RULES (CRITICAL FOR AUDIO):
- Use commas (,) frequently to force the AI voice to pause and breathe.
- Use exclamation marks (!) at the end of punchy lines to add energy.
- Keep lines to 6-10 words max.
- Do NOT output markdown like ** or #. Just raw text with line breaks.
- Make it sound like a real rap song, not a robotic list.`;

      aiContent = await generateWithGroq(`${musicSystemPrompt}\n\nNotes:\n${text}`);
      aiTitle = title || `${vibe || 'Afrobeat'} Study Track`;
      
    } else if (mode === 'quiz') {
      const qCount = numQuestions || 5;
      const diffLevel = difficulty || 'Medium';
      const quizSystemPrompt = `You are a strict academic examiner. Generate exactly ${qCount} multiple-choice questions. Difficulty: ${diffLevel}. Output VALID JSON ONLY.`;
      const groqMessages = [
        { role: "system", content: quizSystemPrompt },
        { role: "user", content: `Notes:\n${text}` }
      ];
      const generatedTextFull = await generateWithGroq(groqMessages);
      try {
        let cleanJson = generatedTextFull.replace(/```json/g, '').replace(/```/g, '').trim();
        const firstBracket = cleanJson.indexOf('{');
        const lastBracket = cleanJson.lastIndexOf('}');
        if (firstBracket !== -1 && lastBracket !== -1) {
          const parsed = JSON.parse(cleanJson.substring(firstBracket, lastBracket + 1));
          if (parsed && Array.isArray(parsed.questions)) {
            aiTitle = parsed.title || title || "Quiz";
            aiContent = generatedTextFull; 
          } else { throw new Error("Missing questions"); }
        } else { throw new Error("No JSON"); }
      } catch (e) {
        aiContent = generatedTextFull;
        aiTitle = title || "Quiz (Parse Failed)";
      }
    } else {
      const error = new Error("Invalid mode."); error.status = 400; throw error;
    }

    const newContent = await Content.create({
      userId, title: aiTitle, subject: subject || 'General', type: mode,
      rawText: inputToCheck, generatedText: aiContent,
    });

    let xpGained = mode === 'summary' ? 10 : mode === 'quiz' ? 25 : mode === 'tutor' ? 5 : 15;
    if (xpGained > 0) {
      const user = await User.findById(userId);
      if (user) {
        user.xp += xpGained;
        user.level = Math.floor(user.xp / 100) + 1; 
        await user.save();
        res.locals.xpGained = xpGained;
        res.locals.newLevel = user.level;
      }
    }

    res.status(201).json({ success: true, message: 'Content generated!', data: newContent });
  } catch (error) {
    console.error('❌ SERVER ERROR:', error.message);
    next(error);
  }
};

const prepareLyricsForSpeech = (text) => {
  return text
    .replace(/\[[^\]]*\]/g, '<break time="0.5s" />') 
    .replace(/\n{2,}/g, '\n')
    .trim();
};

export const generateSpeech = async (req, res, next) => {
  try {
    const { text, style } = req.body;
    if (!text) return res.status(400).json({ success: false, message: "Text is required" });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ success: false, message: "No API key configured." });
    }

    const isRap = style === 'rap';
    const speechText = isRap ? prepareLyricsForSpeech(text) : text;

    const voiceId = "TxGEqnHWrfWFTfGW9XjX"; 
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: speechText,
        model_id: "eleven_turbo_v2_5", 
        voice_settings: {
          stability: isRap ? 0.25 : 0.5,
          similarity_boost: isRap ? 0.90 : 0.75,
          style: isRap ? 0.75 : 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(503).json({ success: false, message: errorData?.detail?.message || "ElevenLabs API failed" });
    }

    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error("ElevenLabs Error:", error.message);
    res.status(503).json({ success: false, message: "Audio generation failed." });
  }
};

// @desc    Search for stock videos using Pexels API
// @route   POST /ai/video/search-stock
export const searchStockVideos = async (req, res, next) => {
  try {
    const { visualPrompt, sceneNumber } = req.body;
    
    if (!visualPrompt) {
      return res.status(400).json({ success: false, message: "Visual prompt is required" });
    }

    // ✅ IMPROVED: Extract better educational keywords
    const keywords = visualPrompt
      .replace(/anime style|cartoon|4k|highly detailed|vibrant colors|professional|bright colors|soft lighting/gi, '')
      .split(/[,\s]+/) // Split by commas AND spaces
      .filter(word => word.length > 2)
      .slice(0, 5) // Get up to 5 keywords
      .join(' ');

    console.log(` Searching Pexels for: "${keywords}"`);

    const searchQuery = encodeURIComponent(keywords || 'educational animation');
    const url = `https://api.pexels.com/videos/search?query=${searchQuery}&per_page=5&orientation=landscape`;

    const apiKey = process.env.PEXELS_API_KEY;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey || '' 
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Pexels API Failed: Status ${response.status}`);
      throw new Error(`Pexels API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.videos || data.videos.length === 0) {
      console.log("⚠️ No videos found, falling back to images");
      // ✅ FALLBACK: Search for images if no videos
      return await searchStockImages(keywords, sceneNumber, res);
    }

    // ✅ Find the BEST video (prefer longer duration and HD quality)
    const sortedVideos = data.videos.sort((a, b) => {
      const aScore = (a.duration || 0) + (a.video_files.find(v => v.quality === 'hd') ? 10 : 0);
      const bScore = (b.duration || 0) + (b.video_files.find(v => v.quality === 'hd') ? 10 : 0);
      return bScore - aScore;
    });

    const bestVideo = sortedVideos[0];
    const videoFiles = bestVideo.video_files || [];
    const bestVideoFile = videoFiles.find(v => v.quality === 'hd' || v.quality === 'sd') || videoFiles[0];

    console.log(`✅ Found video: ${bestVideo.width}x${bestVideo.height}, ${bestVideo.duration}s`);

    res.status(200).json({ 
      success: true, 
      message: `Stock video found for Scene ${sceneNumber}`,
      data: {
        videoUrl: bestVideoFile?.link || null,
        sceneNumber: sceneNumber,
        thumbnail: bestVideo.image,
        duration: bestVideo.duration,
        type: 'video'
      }
    });

  } catch (error) {
    console.error("Stock Video Search Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to find stock video" });
  }
};

// ✅ NEW: Helper function to search for stock IMAGES as fallback
async function searchStockImages(keywords, sceneNumber, res) {
  try {
    const searchQuery = encodeURIComponent(keywords || 'educational');
    const url = `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=3&orientation=landscape`;
    
    const apiKey = process.env.PEXELS_API_KEY;
    const response = await fetch(url, {
      headers: { 'Authorization': apiKey || '' }
    });

    if (!response.ok) {
      throw new Error('Image search failed');
    }

    const data = await response.json();
    
    if (!data.photos || data.photos.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: `No media found for Scene ${sceneNumber}`,
        data: { videoUrl: null, sceneNumber, thumbnail: null, duration: 0, type: 'none' }
      });
    }

    const bestPhoto = data.photos[0];
    
    console.log(`✅ Found image fallback: ${bestPhoto.width}x${bestPhoto.height}`);

    res.status(200).json({ 
      success: true, 
      message: `Stock image found for Scene ${sceneNumber}`,
      data: {
        videoUrl: null, // No video, it's an image
        sceneNumber: sceneNumber,
        thumbnail: bestPhoto.src.large2x || bestPhoto.src.large,
        imageUrl: bestPhoto.src.large2x || bestPhoto.src.large, // Add this for images
        duration: 5, // Display for 5 seconds
        type: 'image'
      }
    });

  } catch (error) {
    console.error("Image Search Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to find media" });
  }
}