const mongoose = require("mongoose");

mongoose.set("strictQuery", true);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // fail in 10s (not 30s) if the database cannot be reached
      maxPoolSize: 10,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // after the first connection, the driver reconnects by itself — just make it visible in the logs
  mongoose.connection.on("disconnected", () => console.warn("⚠️  MongoDB disconnected — retrying…"));
  mongoose.connection.on("reconnected", () => console.log("✅ MongoDB reconnected"));
}

module.exports = connectDB;