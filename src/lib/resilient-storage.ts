import mongoose from 'mongoose';
import { connectDB } from './mongodb';

// In-memory fallback stores
const memoryStore: Record<string, Map<string, unknown>> = {};
let mongoAvailable = true;
let lastRetry = 0;
const RETRY_INTERVAL = 30000; // 30 seconds

function getCollection(name: string): Map<string, unknown> {
  if (!memoryStore[name]) {
    memoryStore[name] = new Map();
  }
  return memoryStore[name];
}

async function checkMongoAvailability(): Promise<boolean> {
  if (mongoAvailable) return true;
  
  const now = Date.now();
  if (now - lastRetry < RETRY_INTERVAL) return false;
  
  lastRetry = now;
  try {
    await connectDB();
    if (mongoose.connection.readyState === 1) {
      mongoAvailable = true;
      console.log('[ResilientStorage] MongoDB reconnected');
      return true;
    }
  } catch {
    console.warn('[ResilientStorage] MongoDB still unavailable, using in-memory fallback');
  }
  return false;
}

export class ResilientStorage {
  /**
   * Try a MongoDB operation first; on failure, fall back to in-memory.
   * @param mongoOp  - async function performing the MongoDB query/write
   * @param fallbackOp - async function performing the in-memory equivalent
   * @param label - optional label for logging
   */
  static async execute<T>(
    mongoOp: () => Promise<T>,
    fallbackOp: () => Promise<T>,
    label = 'operation'
  ): Promise<T> {
    const isMongoUp = await checkMongoAvailability();
    
    if (isMongoUp) {
      try {
        await connectDB();
        return await mongoOp();
      } catch (error) {
        mongoAvailable = false;
        console.warn(`[ResilientStorage] MongoDB ${label} failed, falling back to in-memory:`, error);
        return await fallbackOp();
      }
    }
    
    return await fallbackOp();
  }

  // --- Generic in-memory CRUD helpers ---

  static memoryFind<T>(collection: string, filter: Record<string, unknown> = {}): T[] {
    const store = getCollection(collection);
    const results: T[] = [];
    
    for (const [, value] of store) {
      const doc = value as Record<string, unknown>;
      let matches = true;
      for (const [key, val] of Object.entries(filter)) {
        if (doc[key] !== val) {
          matches = false;
          break;
        }
      }
      if (matches) results.push(value as T);
    }
    return results;
  }

  static memoryFindOne<T>(collection: string, filter: Record<string, unknown> = {}): T | null {
    const results = this.memoryFind<T>(collection, filter);
    return results[0] || null;
  }

  static memoryInsert<T>(collection: string, doc: Record<string, unknown>): T {
    const store = getCollection(collection);
    const id = doc._id?.toString() || new mongoose.Types.ObjectId().toString();
    const fullDoc = { ...doc, _id: id, createdAt: new Date(), updatedAt: new Date() };
    store.set(id, fullDoc);
    return fullDoc as T;
  }

  static memoryUpdate(collection: string, filter: Record<string, unknown>, update: Record<string, unknown>): number {
    const store = getCollection(collection);
    let modified = 0;
    
    for (const [key, value] of store) {
      const doc = value as Record<string, unknown>;
      let matches = true;
      for (const [fKey, fVal] of Object.entries(filter)) {
        if (doc[fKey] !== fVal) {
          matches = false;
          break;
        }
      }
      if (matches) {
        const updateFields = update.$set ? (update.$set as Record<string, unknown>) : update;
        Object.assign(doc, updateFields, { updatedAt: new Date() });
        store.set(key, doc);
        modified++;
      }
    }
    return modified;
  }

  static memoryDelete(collection: string, filter: Record<string, unknown>): number {
    const store = getCollection(collection);
    let deleted = 0;
    
    for (const [key, value] of store) {
      const doc = value as Record<string, unknown>;
      let matches = true;
      for (const [fKey, fVal] of Object.entries(filter)) {
        if (doc[fKey] !== fVal) {
          matches = false;
          break;
        }
      }
      if (matches) {
        store.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  static isMongoAvailable(): boolean {
    return mongoAvailable;
  }
}
