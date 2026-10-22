import Groq from "groq-sdk";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
const BASE_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_TOKENS = 4096; // was 800 — long tutor answers were being cut off and rejected
const TEMPERATURE = 0.4;

const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
const COHERE_MODEL = process.env.COHERE_MODEL || "command-r";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.1-8b-instruct";
const HF_MODEL = process.env.HF_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
// Reasoning models put their thinking in <think> tags — always strip that.
// Code fences are only stripped when we asked for JSON; otherwise students lose their code blocks.
const cleanOutput = (raw = "", { stripFences = false } = {}) => {
  let text = String(raw ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*/gi, "");
  if (stripFences) text = text.replace(/```(?:json)?/gi, "");
  return text.trim();
};

const describeError = (error) => {
  const data = error.response?.data;
  const detail = data?.error?.message || (typeof data === "string" ? data : data ? JSON.stringify(data) : "");
  return `${error.response?.status || error.status || ""} ${String(detail || error.message || error)}`.trim().slice(0, 300);
};

const statusOf = (error) => error?.response?.status || error?.status;

// Bigger answers get more time (fallback providers are slower than Groq)
const timeoutFor = (maxTokens) => Math.min(MAX_TIMEOUT_MS, Math.max(BASE_TIMEOUT_MS, maxTokens * 15));

const openAICompatible = async ({ url, apiKey, model, messages, maxTokens, json = false, headers = {}, timeoutMs }) => {
  const post = (useJson) =>
    axios.post(
      url,
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature: TEMPERATURE,
        ...(useJson ? { response_format: { type: "json_object" } } : {}),
      },
      { timeout: timeoutMs, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...headers } }
    );

  let res;
  try {
    res = await post(json);
  } catch (error) {
    // Some models reject response_format — retry the same provider without it
    if (json && error.response?.status === 400) res = await post(false);
    else throw error;
  }
  const choice = res.data?.choices?.[0];
  return { text: cleanOutput(choice?.message?.content, { stripFences: json }), truncated: choice?.finish_reason === "length" };
};

/* ------------------------------------------------------------------ */
/* Providers — each gets (messages, maxTokens, json, timeoutMs)        */
/* ------------------------------------------------------------------ */
let groqClient = null;
const getGroq = () => (groqClient ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: BASE_TIMEOUT_MS, maxRetries: 1 }));

const tryGroq = async (messages, maxTokens, json, timeoutMs) => {
  const completion = await getGroq().chat.completions.create(
    {
      messages,
      model: GROQ_MODEL,
      temperature: TEMPERATURE,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    },
    { timeout: timeoutMs }
  );
  const choice = completion.choices[0];
  return { text: cleanOutput(choice?.message?.content, { stripFences: json }), truncated: choice?.finish_reason === "length" };
};

const tryOpenRouter = (messages, maxTokens, json, timeoutMs) =>
  openAICompatible({
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: OPENROUTER_MODEL,
    messages,
    maxTokens,
    json,
    timeoutMs,
    headers: { "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173", "X-Title": "Noted Quiz App" },
  });

const tryCohere = async (messages, maxTokens, json, timeoutMs) => {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const turns = messages.filter((m) => m.role !== "system");
  const last = turns[turns.length - 1];
  const history = turns.slice(0, -1).map((m) => ({ role: m.role === "assistant" ? "CHATBOT" : "USER", message: m.content }));

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
    { timeout: timeoutMs, headers: { Authorization: `Bearer ${process.env.COHERE_API_KEY}`, "Content-Type": "application/json" } }
  );
  return { text: cleanOutput(res.data?.text, { stripFences: json }), truncated: res.data?.finish_reason === "MAX_TOKENS" };
};

const tryNVIDIA = (messages, maxTokens, json, timeoutMs) =>
  openAICompatible({
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey: process.env.NVIDIA_API_KEY,
    model: NVIDIA_MODEL,
    messages,
    maxTokens,
    json,
    timeoutMs,
  });

const tryHuggingFace = (messages, maxTokens, json, timeoutMs) =>
  openAICompatible({
    url: "https://router.huggingface.co/v1/chat/completions",
    apiKey: process.env.HF_API_KEY,
    model: HF_MODEL,
    messages,
    maxTokens,
    json,
    timeoutMs,
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
  const messages = Array.isArray(messagesOrPrompt) ? messagesOrPrompt : [{ role: "user", content: messagesOrPrompt }];

  const { json = false, max_tokens = DEFAULT_MAX_TOKENS } = options;
  const timeoutMs = timeoutFor(max_tokens);
  const configured = PROVIDERS.filter((p) => process.env[p.key]);

  if (configured.length === 0) {
    const err = new Error("No AI provider is configured. Set at least one API key in the environment.");
    err.status = 503;
    throw err;
  }

  let lastError;
  let sawRateLimit = false;

  for (const provider of configured) {
    try {
      const { text, truncated } = await provider.run(messages, max_tokens, json, timeoutMs);
      if (!text) throw new Error("empty response");

      if (json) {
        // A cut-off JSON answer is useless — try the next provider
        if (truncated) throw new Error("response was cut off (max_tokens reached)");
        try {
          JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
        } catch {
          throw new Error("invalid JSON response");
        }
      } else if (truncated) {
        // Plain text that hit the limit is still a useful answer — don't throw it away
        console.warn(`[ai] ${provider.name} answer reached max_tokens (${max_tokens}); returning it as-is`);
      }

      return text;
    } catch (error) {
      if (statusOf(error) === 429) sawRateLimit = true;
      console.warn(`[ai] ${provider.name} failed: ${describeError(error)}`);
      lastError = error;
    }
  }

  console.error("[ai] all providers failed. Last error:", describeError(lastError));
  const err = new Error(
    sawRateLimit
      ? "The AI is busy right now. Please wait a few seconds and try again."
      : "The AI service couldn't produce a usable answer right now. Please try again in a moment."
  );
  err.status = sawRateLimit ? 429 : 503;
  throw err;
};

export default generateWithGroq;
