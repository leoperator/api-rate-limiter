import Fastify from 'fastify';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { buyRoutes } from './routes/buy.routes';

dotenv.config();

const app = Fastify({ logger: true });

// 1. Setup Redis Connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

// 2. Load the Lua Script
const luaScriptPath = path.join(__dirname, '../infra/redis/scripts/requestLimit.lua');

// Safety Check: Crash immediately if script is missing so we know what's wrong
if (!fs.existsSync(luaScriptPath)) {
  console.error("CRITICAL ERROR: Lua script not found at", luaScriptPath);
  process.exit(1);
}

const luaScript = fs.readFileSync(luaScriptPath, 'utf8');

// 3. Register the Custom Command
redis.defineCommand('rateLimit', {
  numberOfKeys: 1,
  lua: luaScript,
});

declare module 'ioredis' {
  interface Redis {
    rateLimit(key: string, capacity: string, rate: string, now: string): Promise<number>;
  }
}

// 4. Attach Redis to Fastify
// This lets us access 'fastify.redis' in our routes
app.decorate('redis', redis);

// 5. Register Routes
app.register(buyRoutes);

// 6. Start the Server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();