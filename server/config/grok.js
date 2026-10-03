import Groq from "groq-sdk";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ✅ Try multiple models in case one is restricted or deprecated for your API key
const MODELS = [
  "llama-3.1-8b-instant",
  "llama3-8b-8192", 
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
];

const cleanOutput = (raw = "") =>
  raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

const askHuggingFace = async (messages, maxTokens) => {
  const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n") + "\nASSISTANT:";
  const res = await axios.post(
    "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
    { 
      inputs: prompt, 
      parameters: { 
        max_new_tokens: maxTokens, 
        return_full_text: false, 
        temperature: 0.7 
      } 
    },
    { 
      headers: { 
        Authorization: `Bearer ${process.env.HF_API_KEY}`, 
        "Content-Type": "application/json" 
      } 
    }
  );
  return cleanOutput(res.data?.[0]?.generated_text || "");
};

export const generateWithGroq = async (messagesOrPrompt, options = {}) => {
  const messages = Array.isArray(messagesOrPrompt)
    ? messagesOrPrompt
    : [{ role: "user", content: messagesOrPrompt }];

  const { json = false, max_tokens = 800, ...rest } = options;
  let lastError;

  // 1. Try all Groq models
  for (const model of MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages,
        model,
        temperature: 0.7,
        max_tokens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        ...rest,
      });

      const text = cleanOutput(completion.choices[0]?.message?.content);
      if (text) return text;

      console.warn(`⚠️ Groq (${model}) returned empty content.`);
      lastError = new Error("Groq returned empty content");
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Groq (${model}) failed:`, error.status, error.error?.error?.code || error.message);
    }
  }

  // 2. LAST RESORT: Hugging Face Fallback (100% FREE)
  if (process.env.HF_API_KEY) {
    try {
      console.log("🔄 All Groq models failed. Activating FREE Hugging Face fallback...");
      const text = await askHuggingFace(messages, max_tokens);
      if (text) {
        console.log("✅ Hugging Face fallback successful!");
        return text;
      }
    } catch (hfError) {
      console.error("❌ Hugging Face fallback also failed:", hfError.message);
    }
  } else {
    console.error("❌ Hugging Face fallback skipped: HF_API_KEY is missing from environment variables!");
  }

  console.error("❌ AI generation failed completely:", lastError?.message);
  throw lastError;
};

export default generateWithGroq;
