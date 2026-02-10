const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.warn('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return { conn, success: true };
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    console.warn('Server will continue running without database connection');
    return { conn: null, success: false, error: error.message };
  }
};

module.exports = connectDB;
