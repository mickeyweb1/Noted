import Groq from "groq-sdk";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const BEST_MODEL = "llama3-8b-8192"; // Changed to a reliable, fast Groq model
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
        max_tokens: options.max_tokens || 800, 
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
        console.warn("⚠️ Groq returned empty content after cleaning.");
      }

      return cleanText;

    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Groq attempt ${attempt + 1} failed:`, error.status || error.message);

      // ✅ NEW: If Groq rate limits (429) or has a server error, fallback to Hugging Face
      if (error.status === 429 || (error.status >= 500 && error.status < 600)) {
        console.log("🔄 Groq rate limited. Attempting Hugging Face fallback...");
        try {
          const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\nASSISTANT:';
          
          const hfResponse = await axios.post(
            "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
            {
              inputs: prompt,
              parameters: {
                max_new_tokens: options.max_tokens || 800,
                return_full_text: false,
                temperature: 0.7
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          let hfText = hfResponse.data[0]?.generated_text || "";
          return hfText.replace(/```json/gi, "").replace(/```/g, "").trim();

        } catch (hfError) {
          console.error("❌ Hugging Face fallback also failed:", hfError.message);
        }
        
        const waitTime = 1000 * (attempt + 1);
        console.log(`🔄 Retrying Groq in ${waitTime / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        break; // Don't retry on permanent errors like 400/404
      }
    }
  }

  console.error("❌ AI generation failed after all retries:", lastError.message);
  throw lastError;
};

export default generateWithGroq;