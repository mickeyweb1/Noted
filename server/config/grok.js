import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ CRITICAL FIX: Use the standard, highly reliable Groq model
const BEST_MODEL = "llama-3.1-70b-versatile"; 

const MAX_RETRIES = 2;

export const generateWithGroq = async (messagesOrPrompt, options = {}) => {
  const messages = Array.isArray(messagesOrPrompt)
    ? messagesOrPrompt
    : [{ role: "user", content: messagesOrPrompt }];

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: BEST_MODEL,
        temperature: 0.7,
        max_tokens: options.max_tokens || 4096, 
        ...options,
      });

      let rawText = completion.choices[0]?.message?.content || "";
      
      let cleanText = rawText
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/<think>[\s\S]*/gi, "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      if (!cleanText) {
        console.warn("⚠️ Groq returned empty content after cleaning. Raw text was:", rawText);
      }

      return cleanText;

    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Groq attempt ${attempt + 1} failed:`, error.status || error.message);

      if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
        const waitTime = 1000 * (attempt + 1);
        console.log(`🔄 Retrying in ${waitTime / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        break;
      }
    }
  }

  console.error("❌ Groq failed after all retries:", lastError.message);
  throw lastError;
};

export default generateWithGroq;
