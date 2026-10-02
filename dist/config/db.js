"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDB = async () => {
    try {
        if (!env_1.config.mongoUri) {
            console.warn('MONGO_URI is not set. Skipping DB connection for now.');
            return;
        }
        const conn = await mongoose_1.default.connect(env_1.config.mongoUri, { maxPoolSize: 50, wtimeoutMS: 2500, serverSelectionTimeoutMS: 5000 });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
