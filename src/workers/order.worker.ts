import { Worker } from 'bullmq';
import knex from 'knex';
import knexConfig from '../infra/database/knexfile';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize Database Connection
const db = knex(knexConfig);

console.log("WORKER STARTED: Waiting for orders...");

// The Worker Logic
const worker = new Worker('order-queue', async (job) => {
    const { userId, productId, quantity } = job.data;
    console.log(`[Job ${job.id}] Processing order for ${userId}...`);

    // START TRANSACTION
    await db.transaction(async (trx) => {
        // 1. Get the product (and lock the row to prevent race conditions)
        // select the 'version' column for Optimistic Locking
        const product = await trx('products')
            .where({ id: productId })
            .first();

        if (!product) {
            throw new Error(`Product ${productId} not found`);
        }

        if (product.stock < quantity) {
            console.log(`❌ [Job ${job.id}] Out of Stock!`);
            return; // Fail gracefully
        }

        // 2. The Atomic Update (Optimistic Locking)
        // "Update stock ONLY IF the version hasn't changed since I read it"
        const rowsAffected = await trx('products')
            .where({ id: productId, version: product.version })
            .update({
                stock: product.stock - quantity,
                version: product.version + 1 // Increment version
            });

        if (rowsAffected === 0) {
            // If 0, it means someone else bought it milliseconds before us.
            throw new Error(`Concurrency Conflict! Retrying...`);
        }

        // 3. Record the Order
        await trx('orders').insert({
            user_id: userId,
            product_id: productId,
            status: 'CONFIRMED'
        });

        console.log(`✅ [Job ${job.id}] Sold! Remaining Stock: ${product.stock - quantity}`);
    });

}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
    },
    concurrency: 1 // Process 1 order at a time (Sequential)
});

worker.on('failed', (job, err) => {
    if (job) {
        console.error(`[Job ${job.id}] Failed: ${err.message}`);
    }
});