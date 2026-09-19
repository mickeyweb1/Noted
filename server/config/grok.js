import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ CONFIRMED: This model is in your available list!
const BEST_MODEL = "qwen/qwen3.8-27b"; 

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
        // If it's a 400 or 404, don't retry, it's a permanent model/config issue
        break;
      }
    }
  }

  console.error("❌ Groq failed after all retries:", lastError.message);
  throw lastError;
};

export default generateWithGroq;
