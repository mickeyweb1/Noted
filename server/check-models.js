import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function listModels() {
  try {
    const models = await groq.models.list();
    console.log("✅ YOUR AVAILABLE GROQ MODELS:");
    models.data.forEach(model => {
      console.log(" - " + model.id);
    });
  } catch (error) {
    console.error("Error fetching models:", error.message);
  }
}

listModels();