// Run once after deploying cross-device quiz resume:
// npm run migrate:quiz-session-retention
import 'dotenv/config';
import mongoose from 'mongoose';

const RETENTION_SECONDS = 30 * 24 * 60 * 60;

await mongoose.connect(process.env.MONGO_URI);

const collection = mongoose.connection.collection('quizsessions');
let indexes = [];
try {
  indexes = await collection.listIndexes().toArray();
} catch (error) {
  if (error.codeName !== 'NamespaceNotFound') throw error;
}

const createdAtIndex = indexes.find((index) => index.key?.createdAt === 1);
if (createdAtIndex) {
  if (createdAtIndex.expireAfterSeconds !== RETENTION_SECONDS) {
    await mongoose.connection.db.command({
      collMod: 'quizsessions',
      index: {
        keyPattern: { createdAt: 1 },
        expireAfterSeconds: RETENTION_SECONDS,
      },
    });
  }
} else {
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
}

console.log('✅ Quiz sessions now remain resumable for up to 30 days after the latest saved activity.');
await mongoose.disconnect();
