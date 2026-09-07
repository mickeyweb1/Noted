import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ UPDATED: Using the most powerful model available on your specific account
const BEST_MODEL = "openai/gpt-oss-120b"; 

const MAX_RETRIES = 2;

export const generateWithGroq = async (messagesOrPrompt, options = {}) => {
  // Format the input into standard Groq messages
  const messages = Array.isArray(messagesOrPrompt)
    ? messagesOrPrompt
    : [{ role: "user", content: messagesOrPrompt }];

  let lastError;

  // ✅ AUTOMATIC RETRY SYSTEM
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: BEST_MODEL,
        temperature: 0.7,
        max_tokens: options.max_tokens || 1024,
        ...options,
      });

      let rawText = completion.choices[0]?.message?.content || "";
      
      // Clean up common AI formatting artifacts
      let cleanText = rawText
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/<think>[\s\S]*/gi, "")
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      return cleanText;

    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Groq attempt ${attempt + 1} failed:`, error.status || error.message);

      // If it's a Rate Limit (429) or Server Error (5xx), wait and retry
      if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
        const waitTime = 1000 * (attempt + 1); // Wait 1s, then 2s
        console.log(`🔄 Retrying in ${waitTime / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        // If it's a bad request (400) or auth error (401), don't retry, just fail
        break;
      }
    }
  }

  // If all retries fail, throw the error
  console.error("❌ Groq failed after all retries:", lastError.message);
  throw lastError;
};

export default generateWithGroq;