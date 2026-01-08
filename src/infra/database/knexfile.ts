import { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

// Load .env variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const config: Knex.Config = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
};

export default config;