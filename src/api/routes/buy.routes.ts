import { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';

// 1. Create the Queue connection
// This tells BullMQ: "We have a line named 'order-queue' stored in Redis"
const orderQueue = new Queue('order-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  }
});

export async function buyRoutes(fastify: FastifyInstance) {
  
  fastify.post('/buy', async (req, reply) => {
    const ip = req.ip; 
    const key = `rate_limit:${ip}`;
    
    // Rate Limiter Settings
    const capacity = '5';   
    const refillRate = '1'; 
    const now = Math.floor(Date.now() / 1000).toString();

    try {
      // 2. Check Rate Limit (The Lua Script)
      const allowed = await (fastify as any).redis.rateLimit(key, capacity, refillRate, now);

      if (allowed === 0) {
        return reply.code(429).send({ 
          error: 'Too Many Requests', 
          message: 'You are being rate limited. Please slow down!' 
        });
      }

      // 3. Rate Limit Passed? Add to Queue!
      // We are "producing" a job for the worker to handle later.
      await orderQueue.add('process-order', {
        userId: `User-${Math.floor(Math.random() * 1000)}`, // Fake user ID
        productId: 1, // We are buying the first product (ID: 1)
        quantity: 1
      });

      return reply.code(200).send({ 
        success: true, 
        message: 'Order queued successfully! Worker will process it.', 
        timestamp: new Date().toISOString() 
      });

    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}