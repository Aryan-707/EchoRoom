import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import cookieParser from "cookie-parser"
import mongoose from "mongoose"
import { connectDb } from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import contactsRoutes from "./routes/contactRoutes.js"
import setupSocket from "./socket.js"
import { messagesRoutes } from "./routes/MessagesRoutes.js"
import channelRoutes from "./routes/ChannelRoutes.js"

dotenv.config()

// ─── Application state ──────────────────────────────────────────────────────
let isShuttingDown = false

const app = express()
const port = process.env.PORT || 5000
app.use(cookieParser())
app.use(express.json())
app.use(cors({
    origin: ["https://echo-room-frontend1.onrender.com", "http://localhost:5173", "http://localhost:5174"],
    credentials: true,
}))

app.use(express.static("public"))

// ─── Health check endpoint (returns 503 during shutdown for connection draining) ─
app.get("/health", (req, res) => {
    if (isShuttingDown) {
        return res.status(503).json({
            status: "shutting_down",
            message: "Node is draining connections — not accepting new traffic",
            timestamp: new Date().toISOString()
        })
    }
    return res.status(200).json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    })
})

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes)
app.use("/api/contacts", contactsRoutes)
app.use("/api/messages", messagesRoutes)
app.use("/api/channel", channelRoutes)


app.get("/", (req, res) => {
    res.json({ message: 'Server is running!' });
})

const server = app.listen(port, () => {
    connectDb()
    console.log("server started at port " + port)
})

setupSocket(server)

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000 // 10 seconds max wait

async function gracefulShutdown(signal) {
    if (isShuttingDown) return // Guard against duplicate signals
    isShuttingDown = true

    console.log(`\n⏳ [shutdown] Received ${signal} — starting graceful shutdown...`)

    // 1. Stop accepting new WebSocket connections
    //    Dynamically import live references from socket module
    const { io, pub, sub } = await import("./socket.js")

    if (io) {
        console.log("⏳ [shutdown] Closing Socket.io server (stop accepting new connections)...")
        io.close(() => {
            console.log("✅ [shutdown] Socket.io server closed")
        })
    }

    // 2. Stop accepting new HTTP connections
    console.log("⏳ [shutdown] Closing HTTP server...")
    server.close(() => {
        console.log("✅ [shutdown] HTTP server closed")
    })

    // 3. Wait for existing connections to drain (up to SHUTDOWN_TIMEOUT_MS)
    console.log(`⏳ [shutdown] Waiting up to ${SHUTDOWN_TIMEOUT_MS / 1000}s for existing connections to drain...`)

    await new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log("⚠️  [shutdown] Drain timeout reached — forcing remaining connections closed")
            if (io) {
                io.sockets.sockets.forEach((socket) => {
                    socket.disconnect(true)
                })
            }
            resolve()
        }, SHUTDOWN_TIMEOUT_MS)

        // Check periodically if all connections are gone
        const interval = setInterval(() => {
            const connectedCount = io ? io.sockets.sockets.size : 0
            console.log(`⏳ [shutdown] Active WebSocket connections: ${connectedCount}`)
            if (connectedCount === 0) {
                clearTimeout(timeout)
                clearInterval(interval)
                console.log("✅ [shutdown] All WebSocket connections drained")
                resolve()
            }
        }, 1000)
    })

    // 4. Close Redis connections
    if (pub) {
        console.log("⏳ [shutdown] Closing Redis PUB client...")
        try {
            await pub.quit()
            console.log("✅ [shutdown] Redis PUB client closed")
        } catch (err) {
            console.error("❌ [shutdown] Error closing Redis PUB:", err.message)
            pub.disconnect()
        }
    }

    if (sub) {
        console.log("⏳ [shutdown] Closing Redis SUB client...")
        try {
            await sub.quit()
            console.log("✅ [shutdown] Redis SUB client closed")
        } catch (err) {
            console.error("❌ [shutdown] Error closing Redis SUB:", err.message)
            sub.disconnect()
        }
    }

    // 5. Close MongoDB connection
    console.log("⏳ [shutdown] Closing MongoDB connection...")
    try {
        await mongoose.connection.close()
        console.log("✅ [shutdown] MongoDB connection closed")
    } catch (err) {
        console.error("❌ [shutdown] Error closing MongoDB:", err.message)
    }

    console.log("✅ [shutdown] Graceful shutdown complete. Exiting process.")
    process.exit(0)
}

// Register signal handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Handle uncaught errors during shutdown
process.on("uncaughtException", (err) => {
    console.error("❌ [fatal] Uncaught exception:", err)
    gracefulShutdown("uncaughtException")
})

process.on("unhandledRejection", (reason) => {
    console.error("❌ [fatal] Unhandled promise rejection:", reason)
    gracefulShutdown("unhandledRejection")
})
