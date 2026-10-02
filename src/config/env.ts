import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  MONGO_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  SUPABASE_URL: Joi.string().allow('', null).optional(),
  SUPABASE_KEY: Joi.string().allow('', null).optional(),
  LOCAL_STORAGE_MODE: Joi.string().optional(),
  APP_URL: Joi.string().optional(),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  console.error(`Config validation error: ${error.message}`);
}

export const LOCAL_STORAGE_MODE = String(process.env.LOCAL_STORAGE_MODE || '').toLowerCase() === 'true';

export const config = {
  port: envVars.PORT,
  env: envVars.NODE_ENV,
  mongoUri: envVars.MONGO_URI,
  jwtSecret: envVars.JWT_SECRET,
  supabaseUrl: envVars.SUPABASE_URL,
  supabaseKey: envVars.SUPABASE_KEY,
  localStorageMode: LOCAL_STORAGE_MODE,
};

