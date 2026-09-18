// check-models.js
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function checkModels() {
  try {
    console.log("🔍 Fetching available models from Groq...");
    const models = await groq.models.list();
    
    console.log("✅ Available models for your account:");
    models.data.forEach((model) => {
      console.log(`- ${model.id}`);
    });
    
  } catch (error) {
    console.error("❌ Failed to fetch models:", error.message);
  }
}

checkModels();