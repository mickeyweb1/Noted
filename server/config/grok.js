import Groq from "groq-sdk";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
const REQUEST_TIMEOUT_MS = 30_000; 
const TEMPERATURE = 0.4; 

// ✅ UPDATED: Correct, active model names for each provider
const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free"; // ":free" ensures it uses the free tier
const COHERE_MODEL = process.env.COHERE_MODEL || "command-r-plus"; // Updated from deprecated 'command-r'
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct"; // Updated to the active 3.1 model
const HF_MODEL = process.env.HF_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const cleanOutput = (raw = "") =>
  String(raw ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();

const describeError = (error) => {
  const data = error.response?.data;
  const detail = data?.error?.message || (typeof data === "string" ? data : data ? JSON.stringify(data) : "");
  return String(detail || error.message || error).slice(0, 300);
};

const openAICompatible = async ({ url, apiKey, model, messages, maxTokens, json = false, headers = {} }) => {
  const res = await axios.post(
    url,
    {
      model,
      messages,
      max_tokens: maxTokens,
      temperature: TEMPERATURE,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    },
    {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...headers },
    }
  );
  const choice = res.data?.choices?.[0];
  return { text: cleanOutput(choice?.message?.content), truncated: choice?.finish_reason === "length" };
};

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */
let groqClient = null;
const getGroq = () =>
  (groqClient ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 }));

const tryGroq = async (messages, maxTokens, json) => {
  const completion = await getGroq().chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: TEMPERATURE,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  });
  const choice = completion.choices[0];
  return { text: cleanOutput(choice?.message?.content), truncated: choice?.finish_reason === "length" };
};

const tryOpenRouter = (messages, maxTokens, json) =>
  openAICompatible({
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: OPENROUTER_MODEL,
    messages,
    maxTokens,
    json,
    headers: {
      "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
      "X-Title": "Noted Quiz App",
    },
  });

const tryCohere = async (messages, maxTokens) => {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const turns = messages.filter((m) => m.role !== "system");
  const last = turns[turns.length - 1];
  const history = turns.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "CHATBOT" : "USER",
    message: m.content,
  }));

  const res = await axios.post(
    "https://api.cohere.ai/v1/chat",
    {
      model: COHERE_MODEL,
      message: last.content,
      chat_history: history,
      ...(system ? { preamble: system } : {}),
      temperature: TEMPERATURE,
      max_tokens: maxTokens,
    },
    {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { Authorization: `Bearer ${process.env.COHERE_API_KEY}`, "Content-Type": "application/json" },
    }
  );
  return { text: cleanOutput(res.data?.text), truncated: res.data?.finish_reason === "MAX_TOKENS" };
};

const tryNVIDIA = (messages, maxTokens) =>
  openAICompatible({
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey: process.env.NVIDIA_API_KEY,
    model: NVIDIA_MODEL,
    messages,
    maxTokens,
  });

// ✅ UPDATED: Hugging Face now uses the OpenAI-compatible router
const tryHuggingFace = (messages, maxTokens) =>
  openAICompatible({
    url: "https://router.huggingface.co/v1/chat/completions",
    apiKey: process.env.HF_API_KEY,
    model: HF_MODEL,
    messages,
    maxTokens,
  });

const PROVIDERS = [
  { name: "Groq", key: "GROQ_API_KEY", run: tryGroq },
  { name: "OpenRouter", key: "OPENROUTER_API_KEY", run: tryOpenRouter },
  { name: "Cohere", key: "COHERE_API_KEY", run: tryCohere },
  { name: "NVIDIA", key: "NVIDIA_API_KEY", run: tryNVIDIA },
  { name: "Hugging Face", key: "HF_API_KEY", run: tryHuggingFace },
];

/* ------------------------------------------------------------------ */
/* Main export                                                         */
/* ------------------------------------------------------------------ */
export const generateWithGroq = async (messagesOrPrompt, options = {}) => {
  const messages = Array.isArray(messagesOrPrompt)
    ? messagesOrPrompt
    : [{ role: "user", content: messagesOrPrompt }];

  const { json = false, max_tokens = 800 } = options;
  const configured = PROVIDERS.filter((p) => process.env[p.key]);

  if (configured.length === 0) {
    const err = new Error("No AI provider is configured. Set at least one API key in the environment.");
    err.status = 503;
    throw err;
  }

  let lastError;
  for (const provider of configured) {
    try {
      const { text, truncated } = await provider.run(messages, max_tokens, json);
      if (!text) throw new Error("empty response");
      if (truncated) throw new Error("response was cut off (max_tokens reached)");
      
      // ✅ CRITICAL: If we asked for JSON, validate it before accepting!
      if (json) {
        try {
          const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
          JSON.parse(jsonStr); 
        } catch (e) {
          throw new Error("invalid JSON response");
        }
      }
      
      return text;
    } catch (error) {
      console.warn(`[ai] ${provider.name} failed: ${describeError(error)}`);
      lastError = error;
    }
  }

  console.error("[ai] all providers failed. Last error:", describeError(lastError));
  const err = new Error("The AI service couldn't produce a usable answer right now. Please try again in a moment.");
  err.status = 503;
  throw err;
};

export default generateWithGroq;