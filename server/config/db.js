const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Serverless-optimized settings
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 0, // Allow pool to shrink to 0 when idle
      maxIdleTimeMS: 30000, // Close idle connections after 30s
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    // Don't exit process in serverless - let Vercel handle retries
    throw error;
  }
};

module.exports = connectDB;
