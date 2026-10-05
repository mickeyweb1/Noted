import Groq from "groq-sdk";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ------------------------------------------------------------------ */
/* Helper: Clean AI output (removes thinking tags and markdown)        */
/* ------------------------------------------------------------------ */
const cleanOutput = (raw = "") => {
  if (!raw) return "";
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

/* ------------------------------------------------------------------ */
/* 1. Primary: Groq                                                    */
/* ------------------------------------------------------------------ */
const tryGroq = async (messages, maxTokens, json) => {
  const completion = await groq.chat.completions.create({
    messages,
    model: "qwen/qwen3.8-27b", // Your verified working model
    temperature: 0.7,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  });
  return cleanOutput(completion.choices[0]?.message?.content);
};

/* ------------------------------------------------------------------ */
/* 2. Fallback 1: OpenRouter                                           */
/* ------------------------------------------------------------------ */
const tryOpenRouter = async (messages, maxTokens, json) => {
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "meta-llama/llama-3.1-8b-instruct",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173", // Required by OpenRouter
        "X-Title": "Noted Quiz App",
      },
    }
  );
  return cleanOutput(res.data.choices[0].message.content);
};

/* ------------------------------------------------------------------ */
/* 3. Fallback 2: Cohere                                               */
/* ------------------------------------------------------------------ */
const tryCohere = async (messages, maxTokens) => {
  const lastMessage = messages[messages.length - 1];
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "CHATBOT" : "USER",
    message: m.content,
  }));

  const res = await axios.post(
    "https://api.cohere.ai/v1/chat",
    {
      model: "command-r",
      message: lastMessage.content,
      chat_history: history,
      temperature: 0.7,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return cleanOutput(res.data.text);
};

/* ------------------------------------------------------------------ */
/* 4. Fallback 3: NVIDIA                                               */
/* ------------------------------------------------------------------ */
const tryNVIDIA = async (messages, maxTokens) => {
  const res = await axios.post(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      model: "meta/llama3-70b-instruct",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return cleanOutput(res.data.choices[0].message.content);
};

/* ------------------------------------------------------------------ */
/* 5. Final Resort: Hugging Face                                       */
/* ------------------------------------------------------------------ */
const tryHuggingFace = async (messages, maxTokens) => {
  const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n") + "\nASSISTANT:";
  const res = await axios.post(
    "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
    {
      inputs: prompt,
      parameters: { max_new_tokens: maxTokens, return_full_text: false, temperature: 0.7 },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return cleanOutput(res.data?.[0]?.generated_text || "");
};

/* ------------------------------------------------------------------ */
/* Main Export: Cascading Fallback Generator                           */
/* ------------------------------------------------------------------ */
export const generateWithGroq = async (messagesOrPrompt, options = {}) => {
  const messages = Array.isArray(messagesOrPrompt)
    ? messagesOrPrompt
    : [{ role: "user", content: messagesOrPrompt }];

  const { json = false, max_tokens = 800, ...rest } = options;
  let lastError;

  // 1. Try Groq
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("🤖 Attempting AI generation with Groq...");
      const text = await tryGroq(messages, max_tokens, json);
      if (text) return text;
    } catch (error) {
      console.warn("⚠️ Groq failed:", error.response?.data || error.message);
      lastError = error;
    }
  }

  // 2. Try OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log("🔄 Groq failed. Attempting fallback with OpenRouter...");
      const text = await tryOpenRouter(messages, max_tokens, json);
      if (text) return text;
    } catch (error) {
      console.warn("⚠️ OpenRouter failed:", error.response?.data || error.message);
      lastError = error;
    }
  }

  // 3. Try Cohere
  if (process.env.COHERE_API_KEY) {
    try {
      console.log("🔄 OpenRouter failed. Attempting fallback with Cohere...");
      const text = await tryCohere(messages, max_tokens);
      if (text) return text;
    } catch (error) {
      console.warn("⚠️ Cohere failed:", error.response?.data || error.message);
      lastError = error;
    }
  }

  // 4. Try NVIDIA
  if (process.env.NVIDIA_API_KEY) {
    try {
      console.log("🔄 Cohere failed. Attempting fallback with NVIDIA...");
      const text = await tryNVIDIA(messages, max_tokens);
      if (text) return text;
    } catch (error) {
      console.warn("⚠️ NVIDIA failed:", error.response?.data || error.message);
      lastError = error;
    }
  }

  // 5. Try Hugging Face (Final Resort)
  if (process.env.HF_API_KEY) {
    try {
      console.log("🔄 All primary APIs failed. Attempting final fallback with Hugging Face...");
      const text = await tryHuggingFace(messages, max_tokens);
      if (text) return text;
    } catch (error) {
      console.warn("⚠️ Hugging Face failed:", error.response?.data || error.message);
      lastError = error;
    }
  }

  console.error("❌ AI generation failed completely across all providers:", lastError?.message);
  throw new Error("AI generation failed. All providers are currently busy or misconfigured. Please check your environment variables.");
};

export default generateWithGroq;
