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

  cached = mongoose.connect(mongoUri, opts);
  globalCache._mongooseConnection = cached;

  return cached;
}
