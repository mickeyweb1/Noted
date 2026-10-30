import { RateLimitCounter } from '../models/RateLimitCounter.js';

export class MongoRateLimitStore {
  init(options) {
    this.windowMs = options.windowMs;
  }

  async get(key) {
    const record = await RateLimitCounter.findOne({ _id: key, resetAt: { $gt: new Date() } }).lean();
    return record ? { totalHits: record.hits, resetTime: record.resetAt } : undefined;
  }

  async increment(key) {
    const now = new Date();
    const activeRecord = await RateLimitCounter.findOneAndUpdate(
      { _id: key, resetAt: { $gt: now } },
      { $inc: { hits: 1 } },
      { returnDocument: 'after' }
    );
    if (activeRecord) return { totalHits: activeRecord.hits, resetTime: activeRecord.resetAt };

    try {
      const newWindowRecord = await RateLimitCounter.findOneAndUpdate(
        { _id: key, resetAt: { $lte: now } },
        { $set: { hits: 1, resetAt: new Date(now.getTime() + this.windowMs) } },
        { upsert: true, returnDocument: 'after' }
      );
      return { totalHits: newWindowRecord.hits, resetTime: newWindowRecord.resetAt };
    } catch (error) {
      if (error.code !== 11000) throw error;
      return this.increment(key);
    }
  }

  async decrement(key) {
    await RateLimitCounter.updateOne({ _id: key, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await RateLimitCounter.deleteOne({ _id: key });
  }

  async shutdown() {}
}
