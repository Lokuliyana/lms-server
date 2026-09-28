import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      console.warn('MONGO_URI is not set. Skipping DB connection for now.');
      return;
    }
    const conn = await mongoose.connect(config.mongoUri, { maxPoolSize: 50, wtimeoutMS: 2500, serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};
