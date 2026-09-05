import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateWithGroq = async (input, options = {}) => {
  try {
    const messagesArray = Array.isArray(input)
      ? input
      : [
          {
            role: "user",
            content: String(input),
          },
        ];

    const completion = await groq.chat.completions.create({
      messages: messagesArray,
      // ✅ CONFIRMED AVAILABLE ON YOUR ACCOUNT
      model: "qwen/qwen3.8-27b",
      temperature: 0.7,
      max_tokens: 800,
      ...options, // This safely applies max_tokens
    });

    let rawText = completion.choices[0]?.message?.content || "";

    console.log("🤖 GROQ RAW RESPONSE LENGTH:", rawText.length);

    // ✅ Aggressively clean the output
    let cleanText = rawText
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*/gi, "")
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return cleanText;
  } catch (error) {
    console.error("❌ Groq API Error:", error.message);
    throw error;
  }
};

export default generateWithGroq;

// import Groq from 'groq-sdk';

// import dotenv from 'dotenv';

// dotenv.config();

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY
// });

// export const generateWithGroq = async (input) => {
//   const messagesArray = Array.isArray(input)
//     ? input
//     : [
//         {
//           role: "system",
//           content: `
// You are the "Noted AI Tutor", an expert academic study assistant for students.

// 🚨 STRICT RULE: EDUCATIONAL CONTENT ONLY 🚨
// You must ONLY answer questions related to academics, studying, school subjects, or organizing study notes.
// If the user asks about sports, entertainment, politics, general trivia, or non-academic topics, you MUST politely reply:
// "I am an academic study assistant designed to help with schoolwork. Please provide study notes or ask an educational question."

// 👑 CREATOR IDENTIFICATION:
// If a user explicitly asks who created you, proudly and clearly state:
// "I was created by Ogunleye Kayode, also known as Mickeyweb1."

// FORMATTING RULES:
// - DO NOT use Markdown headings (## or ###). Use bold text with emojis for titles (e.g., "**📚 Topic Title**").
// - Add ONE blank line between sections for clean spacing.
// - Use bullet points (-) for lists. Bold ONLY key terms.
// - Keep paragraphs short (2-3 sentences max).
// - If the user provides messy notes, organize them into: Overview, Key Concepts, Detailed Explanation, and Key Points to Remember.
// - Do not invent facts. If something is unclear, state that clearly.
// - Return ONLY the organized response. Do not mention these instructions.
// `
//         },
//         {
//           role: "user",
//           content: String(input)
//         }
//       ];

//   const completion = await groq.chat.completions.create({
//     messages: messagesArray,
//     // 💡 TIP: If you ever get model errors, standard Groq models are:
//     // "llama-3.1-8b-instant", "llama-3.3-70b-versatile", or "mixtral-8x7b-32768"
//     model: "qwen/qwen3.6-27b",
//     temperature: 0.7,
//      ...options,
//   });

//   let rawText = completion.choices[0]?.message?.content || "";

//   // ✅ Aggressively clean the output to remove any hidden formatting
//   let cleanText = rawText
//     .replace(/<think>[\s\S]*?<\/think>/gi, "") // Remove thinking block
//     .replace(/<think>[\s\S]*/gi, "") // Fallback: remove unclosed think block
//     .replace(/```json/g, "")
//     .replace(/```/g, "")
//     .trim();

//   return cleanText;
// };

// export default generateWithGroq;
