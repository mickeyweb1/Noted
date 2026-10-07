import dotenv from "dotenv";
import axios from "axios";
import Groq from "groq-sdk";

dotenv.config();

const testMessage = [{ role: "user", content: "Say 'API Working' in exactly 3 words." }];

async function testGroq() {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const res = await groq.chat.completions.create({
      messages: testMessage,
      model: "qwen/qwen3.8-27b",
      max_tokens: 10
    });
    console.log("✅ GROQ is WORKING:", res.choices[0].message.content.trim());
  } catch (err) {
    console.log("❌ GROQ FAILED:", err.message);
  }
}

async function testOpenRouter() {
  try {
    const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "meta-llama/llama-3.1-8b-instruct",
      messages: testMessage,
      max_tokens: 10
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Noted Quiz App"
      }
    });
    console.log("✅ OPENROUTER is WORKING:", res.data.choices[0].message.content.trim());
  } catch (err) {
    console.log("❌ OPENROUTER FAILED:", err.response?.data?.error?.message || err.message);
  }
}

async function testCohere() {
  try {
    const res = await axios.post("https://api.cohere.ai/v1/chat", {
      model: "command-r",
      message: "Say 'API Working' in exactly 3 words.",
      max_tokens: 10
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    console.log("✅ COHERE is WORKING:", res.data.text.trim());
  } catch (err) {
    console.log("❌ COHERE FAILED:", err.response?.data?.message || err.message);
    console.log("Note: Cohere free tier requires a credit card on file sometimes.");
  }
}

async function testNVIDIA() {
  try {
    const res = await axios.post("https://integrate.api.nvidia.com/v1/chat/completions", {
      model: "meta/llama3-70b-instruct",
      messages: testMessage,
      max_tokens: 10
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    console.log("✅ NVIDIA is WORKING:", res.data.choices[0].message.content.trim());
  } catch (err) {
    console.log("❌ NVIDIA FAILED:", err.response?.data?.error?.message || err.message);
  }
}

async function testHuggingFace() {
  try {
    const res = await axios.post("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", {
      inputs: "Say 'API Working' in exactly 3 words.",
      parameters: { max_new_tokens: 10, return_full_text: false }
    }, {
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    console.log("✅ HUGGING FACE is WORKING:", res.data[0]?.generated_text?.trim());
  } catch (err) {
    console.log("❌ HUGGING FACE FAILED:", err.response?.data?.error || err.message);
  }
}

console.log("🚀 Starting API Tests...\n");
await testGroq();
await testOpenRouter();
await testCohere();
await testNVIDIA();
await testHuggingFace();
console.log("\n🏁 Testing complete!");