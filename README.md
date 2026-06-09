# MPC Drop System

A production-grade limited-stock product drop system built with Node.js, TypeScript, Prisma, and React.


## Architecture

Client (React) → Express API → PostgreSQL (Neon)
                      ↓
                 Cron Job (expiry)

## How Race Conditions Were Handled

Used PostgreSQL SELECT FOR UPDATE inside a Prisma transaction to lock the product row before decrementing stock. This ensures that when 100 users hit /reserve simultaneously, each transaction waits for the lock and only succeeds if stock > 0. This prevents overselling by serializing concurrent writes to the same product row.

## Schema Decisions

- Reservation holds status (pending/completed/expired) and expiresAt — allows cron job to restore stock
- InventoryLog provides a full audit trail for every stock change
- User is separate from Reservation to support multiple reservations per user
- Order is created only on successful checkout, not on reservation

## Trade-offs

- SELECT FOR UPDATE serializes writes which reduces throughput under high load, but guarantees correctness
- Cron job runs every 60 seconds — expired reservations may hold stock for up to 60s after expiry
- JWT tokens are stateless — logout does not invalidate tokens server-side

## What Would Break at 10k Concurrent Users

- Single PostgreSQL instance would become a bottleneck due to row-level locking
- The SELECT FOR UPDATE approach would create a queue of waiting transactions
- Node.js single-threaded event loop would struggle with 10k simultaneous connections
- Cron job running in-process would compete with request handling

## How to Scale

- Database: Use connection pooling (PgBouncer), read replicas for GET endpoints
- Cache: Redis for product stock reads (invalidate on write)
- Queue: Replace cron job with BullMQ/Redis for reservation expiry
- Horizontal scaling: Multiple Node.js instances behind a load balancer

## Tech Stack

- Backend: Node.js, TypeScript, Express, Prisma, PostgreSQL
- Frontend: React, TypeScript
- Auth: JWT + bcryptjs
- Validation: Zod
- Logging: Morgan
- Testing: Jest, React Testing Library
- Database: Neon (PostgreSQL)

## API Endpoints

- POST /users/register - Register user
- POST /users/login - Login, returns JWT
- GET /products - List products (pagination, filter, sort)
- GET /products/:id - Get product
- POST /reserve - Reserve product (JWT required)
- POST /checkout - Complete purchase (JWT required)
- GET /health - Health check
- GET /metrics - System metrics
