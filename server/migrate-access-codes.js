// Run ONCE from the server folder:  node migrate-access-codes.js
// Old quizzes stored accessCodes as ["T-ABC...", ...]. The new Quiz schema expects [{ code, createdAt }].
// Querying old documents with the new schema throws Mongoose cast errors, so convert them first.
import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI);

const quizzes = mongoose.connection.collection('quizzes'); // native collection: no schema casting
let migrated = 0;

// Matches any document whose accessCodes array contains a plain string
for await (const quiz of quizzes.find({ accessCodes: { $type: 'string' } })) {
  const accessCodes = quiz.accessCodes.map((c) =>
    typeof c === 'string'
      // Existing codes start their 30-day life today so current quizzes don't expire the moment you deploy.
      ? { code: c, createdAt: new Date() }
      : c
  );
  
  await quizzes.updateOne({ _id: quiz._id }, { $set: { accessCodes } });
  migrated++;
}

console.log(`✅ Migrated ${migrated} quiz(zes).`);
await mongoose.disconnect();