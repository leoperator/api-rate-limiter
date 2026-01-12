# 🛡️ API Rate Limiter: Distributed Rate Limiter & Flash Sale Engine

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

**API Rate Limiter** is a high-performance backend engine designed to handle massive traffic spikes during flash sales (e.g., ticket drops, limited releases).

Unlike standard rate limiters, this project implements a **Distributed Token Bucket Algorithm** using custom **Redis Lua scripts** to ensure atomic operations across a cluster. It also solves the "Overselling Problem" using **Optimistic Locking** in PostgreSQL.

---

## 🚀 Key Features

### 1. ⚡ Distributed Rate Limiter (Redis + Lua)
- Implements the **Token Bucket Algorithm** directly in Redis using Lua.
- **Why Lua?** Ensures atomicity. Checking the balance and decrementing the token happens in a single, indivisible step, preventing race conditions during high concurrency.
- **Zero Latency:** Logic executes on the Redis server, eliminating network round-trips.

### 2. 📨 Event-Driven Architecture (BullMQ)
- Decouples the **Request Ingestion** (API) from **Order Processing** (Worker).
- Requests are instantly pushed to a queue, keeping API response time < 50ms even under load.
- Background workers process orders sequentially to manage database pressure.

### 3. 🔒 Concurrency Control (Optimistic Locking)
- Prevents **"Double Spending"** or overselling inventory.
- Uses a `version` column in PostgreSQL. Transactions only succeed if the data hasn't changed since it was read.
- **Strict ACID compliance** for inventory management.

---

## 🏗️ Architecture

```
    Client-->|POST /buy| API_Gateway[Fastify Server];
    API_Gateway-->|1. Check Limit| Redis[Redis (Lua Script)];
    Redis-- Allowed -->API_Gateway;
    Redis-- Blocked (429) -->Client;
    API_Gateway-->|2. Push Job| Queue[BullMQ Order Queue];
    Queue-->|3. Process Job| Worker[Background Worker];
    Worker-->|4. Transaction| DB[(PostgreSQL)];
```

## 🛠️ Tech Stack

- Language: TypeScript / Node.js
- Framework: Fastify
- Database: PostgreSQL (Knex.js ORM)
- Caching/Queue: Redis (ioredis + BullMQ)
- Infrastructure: Docker & Docker Compose

## 📂 Project Structure

```
src/
├── api/
│   ├── routes/       # API Endpoint logic
│   └── server.ts     # Fastify Entry point
├── infra/
│   ├── database/     # Migrations & Seeds
│   └── redis/
│       └── scripts/  # Custom Lua Scripts
└── workers/          # BullMQ Worker
```



## 🏁 Getting Started
### Prerequisites
- Docker Desktop installed and running.
- Node.js (v18+) installed.

### 1. Clone & Install
   ```
   git clone https://github.com/leoperator/api-rate-limiter.git
   cd flash-sale-system
   npm install
   ```

### 2. Start Infrastructure
  Spin up Redis and PostgreSQL containers:
  
  ```
  docker-compose up -d
  ```

### 3. Database Setup
  Run migrations to create tables and seed dummy data:

  ```
  npx knex migrate:latest --knexfile src/infra/database/knexfile.ts
  npx knex seed:run --knexfile src/infra/database/knexfile.ts
  ```

### 4. Run the Engine
You need two terminals:

Terminal 1 (API Server):
```
npm run dev
```

Terminal 2 (Worker):

```
npm run worker
```

## 🧪 Testing the Limit
Send 10 requests instantly to trigger the Rate Limiter (Capacity: 5 requests).

PowerShell :
```
1..10 | % { 
    $r = Invoke-RestMethod -Uri "http://localhost:3000/buy" -Method Post -ContentType "application/json" -Body "{}" -ErrorAction SilentlyContinue
    if ($?) { 
        Write-Host "Success: $($r.message)" -ForegroundColor Green 
    } else { 
        Write-Host "BLOCKED: Too Many Requests" -ForegroundColor Red 
    }
}
```

### Expected Output:

- 5x <span style="color:green">Success</span> (Order Queued)

- 5x <span style="color:red">BLOCKED</span> (HTTP 429)
