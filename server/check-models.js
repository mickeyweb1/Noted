import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function checkAvailableModels() {
  try {
    console.log("🔍 Fetching available models from Groq...\n");
    const list = await groq.models.list();
    
    console.log("✅ Here are the models currently available to your API key:");
    list.data.forEach(model => {
      console.log(`- ${model.id}`);
    });
    
    console.log("\n💡 Recommendation: Look for 'llama3-70b', 'llama3-8b', or 'qwen' in this list.");
  } catch (error) {
    console.error("❌ Error fetching models:", error.message);
  }
}

checkAvailableModels();