import Fastify from 'fastify';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { buyRoutes } from './routes/buy.routes';
import cors from '@fastify/cors';

dotenv.config();

const app = Fastify({ logger: true });

// --- 1. SETUP REDIS & LUA  ---
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// Load the Lua Script
const luaScriptPath = path.join(__dirname, '../infra/redis/scripts/requestLimit.lua');

// Safety Check
if (!fs.existsSync(luaScriptPath)) {
  console.error("CRITICAL ERROR: Lua script not found at", luaScriptPath);
  process.exit(1);
}

const luaScript = fs.readFileSync(luaScriptPath, 'utf8');

// Register the Custom Command
redis.defineCommand('rateLimit', {
  numberOfKeys: 1,
  lua: luaScript,
});

declare module 'ioredis' {
  interface Redis {
    rateLimit(key: string, capacity: string, rate: string, now: string): Promise<number>;
  }
}

// Attach Redis to Fastify
app.decorate('redis', redis);

// --- 2. START SERVER (Async Logic Moves Here) ---
const start = async () => {
  try {
    // MOVED INSIDE: Register CORS
    await app.register(cors, {
      origin: true 
    });

    // MOVED INSIDE: Register Routes
    await app.register(buyRoutes);

    // Start Listening
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();