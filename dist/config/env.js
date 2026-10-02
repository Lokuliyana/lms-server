"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.LOCAL_STORAGE_MODE = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const joi_1 = __importDefault(require("joi"));
dotenv_1.default.config();
const envSchema = joi_1.default.object({
    PORT: joi_1.default.number().default(5000),
    NODE_ENV: joi_1.default.string().valid('development', 'production', 'test').default('development'),
    MONGO_URI: joi_1.default.string().required(),
    JWT_SECRET: joi_1.default.string().required(),
    SUPABASE_URL: joi_1.default.string().allow('', null).optional(),
    SUPABASE_KEY: joi_1.default.string().allow('', null).optional(),
    LOCAL_STORAGE_MODE: joi_1.default.string().optional(),
    APP_URL: joi_1.default.string().optional(),
}).unknown(true);
const { error, value: envVars } = envSchema.validate(process.env);
if (error) {
    console.error(`Config validation error: ${error.message}`);
}
exports.LOCAL_STORAGE_MODE = String(process.env.LOCAL_STORAGE_MODE || '').toLowerCase() === 'true';
exports.config = {
    port: envVars.PORT,
    env: envVars.NODE_ENV,
    mongoUri: envVars.MONGO_URI,
    jwtSecret: envVars.JWT_SECRET,
    supabaseUrl: envVars.SUPABASE_URL,
    supabaseKey: envVars.SUPABASE_KEY,
    localStorageMode: exports.LOCAL_STORAGE_MODE,
};
