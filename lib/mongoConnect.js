import mongoose from "mongoose";

let isConnected = false;

// Use a single connection across hot reloads in dev
if (!global._mongoConnection) {
  global._mongoConnection = { conn: null, promise: null };
}

const MONGODB_URI = process.env.MONGODB_URI;

export default async function mongoConnect() {
  if (isConnected && global._mongoConnection.conn) {
    // console.log("✅ MongoDB already connected.");
    return global._mongoConnection.conn;
  }

  if (!MONGODB_URI) throw new Error("❌ MONGODB_URI is not defined");

  if (!global._mongoConnection.promise) {
    global._mongoConnection.promise = mongoose.connect(MONGODB_URI, {
      // Add any mongoose options here if needed
      bufferCommands: false,
    });
  }

  try {
    global._mongoConnection.conn = await global._mongoConnection.promise;
    isConnected = true;
    // console.log("✅ MongoDB connected.");
    return global._mongoConnection.conn;
  } catch (err) {
    global._mongoConnection.promise = null;
    // console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}
