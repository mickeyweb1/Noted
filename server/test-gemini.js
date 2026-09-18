// test-gemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Use the API key from your .env file
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY is missing in your .env file!");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function testGemini() {
  try {
    console.log("🔍 Testing Gemini API connection...");
    
    // Use gemini-1.5-flash as it is fast, reliable, and has a generous free tier
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = "Reply with exactly this phrase: 'Gemini API is working perfectly!'";
    
    console.log("⏳ Sending request to Google...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ SUCCESS! Gemini responded with:");
    console.log(text);
    
  } catch (error) {
    console.error("❌ FAILED! Gemini API Error:");
    console.error(error.message);
  }
}

testGemini();