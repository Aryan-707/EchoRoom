# Horizontal Scaling Guide — EchoRoom

> How to scale EchoRoom from a single node to a multi-node, zero-downtime deployment.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Redis Pub/Sub — Cross-Node Event Synchronization](#redis-pubsub--cross-node-event-synchronization)
3. [Scaling Horizontally — Adding Nodes](#scaling-horizontally--adding-nodes)
4. [Graceful Shutdown — Zero-Downtime Deployments](#graceful-shutdown--zero-downtime-deployments)
5. [Load Balancer Configuration](#load-balancer-configuration)
6. [Health Check & Connection Draining](#health-check--connection-draining)
7. [Docker Compose — Multi-Node Setup](#docker-compose--multi-node-setup)
8. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

```
                    ┌──────────────┐
                    │   NGINX LB   │
                    │  (sticky ws) │
                    └──────┬───────┘
               ┌───────────┼───────────┐
               ▼           ▼           ▼
         ┌──────────┐┌──────────┐┌──────────┐
         │  Node 1  ││  Node 2  ││  Node 3  │
         │ Express  ││ Express  ││ Express  │
         │Socket.io ││Socket.io ││Socket.io │
         └────┬─────┘└────┬─────┘└────┬─────┘
              │           │           │
              └─────┬─────┘─────┬─────┘
                    ▼           ▼
             ┌───────────┐ ┌──────────┐
             │   Redis   │ │ MongoDB  │
             │  Pub/Sub  │ │ (shared) │
             └───────────┘ └──────────┘
```

Each EchoRoom node runs its own Express + Socket.io server. All nodes share:

- **Redis** — for real-time event broadcasting across nodes
- **MongoDB** — for persistent message/user/channel storage

---

## Redis Pub/Sub — Cross-Node Event Synchronization

### The Problem

When User A is connected to **Node 1** and sends a message to User B on **Node 2**, Node 1 has no knowledge of User B's socket. Without coordination, the message would be lost.

### The Solution

EchoRoom uses **Redis Pub/Sub** with two channels:

| Channel            | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `direct-message`   | 1:1 direct messages between users         |
| `channel-message`  | Group channel messages to all members     |

#### Flow for a Direct Message

```
1. User A (Node 1) sends "sendMessage" via WebSocket
2. Node 1 saves message to MongoDB
3. Node 1 publishes { messageId, senderId, recipientId } to Redis "direct-message"
4. ALL nodes (including Node 1) receive the pub/sub event
5. Each node checks its local userSocketMap for the sender/recipient
6. The node holding the recipient's socket emits "recieveMessage" to them
```

#### Flow for a Channel Message

```
1. User A (Node 1) sends "send-channel-message"
2. Node 1 saves to MongoDB and updates the Channel document
3. Node 1 publishes { messageId, channelId } to Redis "channel-message"
4. ALL nodes look up channel members in their local userSocketMap
5. Each node delivers to whichever members are connected to it
```

### Why This Works

- **Decoupled**: Nodes don't need to know about each other
- **Idempotent**: Each node only delivers to sockets it owns
- **Scalable**: Adding a new node = automatic pub/sub subscription

---

## Scaling Horizontally — Adding Nodes

To add a new EchoRoom instance:

1. **Deploy the same application code** to the new container/VM
2. **Point to the same Redis and MongoDB** via environment variables
3. **Register the new node** with the load balancer
4. That's it — the new node automatically subscribes to Redis channels

### Environment Variables (per node)

```env
PORT=5000
DATABASE_URL=mongodb://mongo:27017/echoroom
REDIS_HOST=redis-server.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

---

## Graceful Shutdown — Zero-Downtime Deployments

The server handles `SIGTERM` and `SIGINT` with a coordinated shutdown sequence:

```
Signal received (SIGTERM)
   │
   ├── 1. Mark node as unhealthy → /health returns 503
   │      └── Load balancer stops sending new connections
   │
   ├── 2. Close Socket.io server (reject new WS connections)
   │
   ├── 3. Close HTTP server (reject new HTTP requests)
   │
   ├── 4. Wait for active connections to drain (max 10s)
   │      └── Check every 1s; force-disconnect after timeout
   │
   ├── 5. Close Redis PUB client (graceful quit)
   │
   ├── 6. Close Redis SUB client (graceful quit)
   │
   ├── 7. Close MongoDB connection
   │
   └── 8. Exit process
```

### Why 10 Seconds?

- Docker sends `SIGTERM` then waits `stop_grace_period` (default 10s) before `SIGKILL`
- Kubernetes default `terminationGracePeriodSeconds` is 30s
- 10s is enough for most in-flight WebSocket messages to complete
- If connections haven't drained by then, they are force-closed

### Rolling Deployment Sequence

```
1. Deploy new container (Node 2 v2)
2. Wait for /health → 200
3. Send SIGTERM to old container (Node 2 v1)
   → /health → 503 → LB stops routing to it
   → Existing connections drain
   → Process exits cleanly
4. Repeat for each node
```

**Result**: Zero dropped messages, zero downtime.

---

## Load Balancer Configuration

### NGINX Configuration for WebSocket + Health Checks

```nginx
upstream echoroom_backend {
    # Health-checked upstream — NGINX removes unhealthy nodes
    server backend-1:5000 max_fails=2 fail_timeout=10s;
    server backend-2:5000 max_fails=2 fail_timeout=10s;
    server backend-3:5000 max_fails=2 fail_timeout=10s;

    # Sticky sessions using IP hash (required for Socket.io polling fallback)
    ip_hash;
}

server {
    listen 80;
    server_name echoroom.example.com;

    # WebSocket upgrade support
    location /socket.io/ {
        proxy_pass http://echoroom_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout for idle WebSocket connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # API and static files
    location / {
        proxy_pass http://echoroom_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Key NGINX Settings

| Setting               | Value     | Why                                           |
| --------------------- | --------- | --------------------------------------------- |
| `ip_hash`             | enabled   | Sticky sessions for Socket.io long-polling    |
| `proxy_read_timeout`  | 86400s    | Keep WebSocket connections alive for 24h       |
| `max_fails`           | 2         | Mark node unhealthy after 2 failed checks     |
| `fail_timeout`        | 10s       | Wait 10s before re-checking unhealthy node    |

---

## Health Check & Connection Draining

### `/health` Endpoint Behavior

| State        | Status Code | Response                                     |
| ------------ | ----------- | -------------------------------------------- |
| **Running**  | `200`       | `{ "status": "healthy", "uptime": 1234.5 }` |
| **Draining** | `503`       | `{ "status": "shutting_down" }`              |

### How Draining Works

1. Node receives `SIGTERM` → sets `isShuttingDown = true`
2. Next `/health` request returns **503**
3. Load balancer detects unhealthy node → routes new traffic elsewhere
4. Existing WebSocket connections continue to work (they're already established)
5. After connections drain (or 10s timeout), process exits

---

## Docker Compose — Multi-Node Setup

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend-1
      - backend-2
    networks:
      - echo-room-network

  backend-1:
    build: ./backend
    environment:
      - PORT=5000
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/health"]
      interval: 5s
      timeout: 3s
      retries: 3
    stop_grace_period: 15s
    networks:
      - echo-room-network

  backend-2:
    build: ./backend
    environment:
      - PORT=5000
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/health"]
      interval: 5s
      timeout: 3s
      retries: 3
    stop_grace_period: 15s
    networks:
      - echo-room-network

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    networks:
      - echo-room-network

networks:
  echo-room-network:
    driver: bridge
```

### Scaling with `docker compose`

```bash
# Scale to 5 backend replicas
docker compose up -d --scale backend-1=5

# Rolling restart (zero-downtime)
docker compose up -d --no-deps --build backend-1
```

---

## Deployment Checklist

- [ ] **Redis** is accessible from all nodes with the same credentials
- [ ] **MongoDB** is accessible from all nodes (use replica set for production)
- [ ] **NGINX** or load balancer configured with:
  - [ ] WebSocket upgrade support (`Upgrade` + `Connection` headers)
  - [ ] Sticky sessions (`ip_hash` or cookie-based)
  - [ ] Health check on `/health` endpoint
- [ ] **Docker** containers have `stop_grace_period >= 15s`
- [ ] **Environment variables** are consistent across all nodes
- [ ] **k6 load test** passes: `k6 run load-test/k6-websocket.js`
- [ ] **Graceful shutdown** verified: `docker stop <container>` drains cleanly
- [ ] **Monitoring** set up for:
  - [ ] Redis Pub/Sub message throughput
  - [ ] WebSocket connection count per node
  - [ ] MongoDB query latency
  - [ ] `/health` endpoint from LB

---

## FAQ

**Q: Do I need `@socket.io/redis-adapter`?**

No. EchoRoom implements its own Redis Pub/Sub layer directly with `ioredis`. The adapter would abstract this, but the current approach gives full control over the serialization and routing logic.

**Q: What happens if Redis goes down?**

Messages sent while Redis is down will fail to publish. The `retryStrategy` in the Redis config will attempt reconnection. Messages are still persisted to MongoDB, so no data is lost — only real-time delivery is affected.

**Q: Can I use this with Kubernetes?**

Yes. Replace NGINX with a Kubernetes `Service` (type `LoadBalancer` or use an Ingress controller). Set `terminationGracePeriodSeconds: 30` in your Pod spec, and the `/health` endpoint works as a readiness probe:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 10
```
