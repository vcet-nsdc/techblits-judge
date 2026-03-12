import mongoose from "mongoose";

type GlobalCache = typeof globalThis & {
  _mongooseConnection?: Promise<typeof mongoose>;
};

const globalCache = global as GlobalCache;
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB ?? "competition-platform";

let cached = globalCache._mongooseConnection;

export async function connectDB() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (cached) {
    return cached;
  }

  const opts = {
    dbName: mongoDbName,
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  };

  cached = mongoose.connect(mongoUri, opts).then(async (conn) => {
    // One-time cleanup: drop stale legacy indexes from old db/models.ts
    // The old schema used integer-based `id` fields with unique indexes.
    // These cause duplicate key errors since the new Mongoose models don't set `id`.
    try {
      const db = conn.connection.db;
      if (db) {
        const collections = ['teams', 'evaluations'];
        for (const name of collections) {
          try {
            await db.collection(name).dropIndex('id_1');
            console.log(`Dropped stale legacy index id_1 from ${name}`);
          } catch {
            // Index doesn't exist — that's fine
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
    return conn;
  });
  globalCache._mongooseConnection = cached;

  return cached;
}
