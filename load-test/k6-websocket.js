/**
 * k6 WebSocket Load Test for EchoRoom
 * ─────────────────────────────────────
 * Simulates 1,000 concurrent users connecting via WebSocket,
 * sending a message every 2 seconds, and measuring round-trip latency.
 *
 * Usage:
 *   k6 run load-test/k6-websocket.js
 *   k6 run --out json=load-test/results.json load-test/k6-websocket.js
 *
 * Small-scale smoke test:
 *   k6 run --vus 10 --duration 15s load-test/k6-websocket.js
 */

import ws from "k6/ws";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

// ─── Custom Metrics ──────────────────────────────────────────────────────────
const wsConnectErrors  = new Counter("ws_connect_errors");
const wsMessagesSent   = new Counter("ws_messages_sent");
const wsMessagesRecv   = new Counter("ws_messages_received");
const wsErrors         = new Rate("ws_error_rate");
const wsRoundTrip      = new Trend("ws_roundtrip_latency", true); // in ms

// ─── Test Configuration ─────────────────────────────────────────────────────
const BASE_WS_URL = __ENV.WS_URL || "ws://localhost:5000";
const SEND_INTERVAL_SEC = 2;  // send a message every 2 seconds

export const options = {
    stages: [
        { duration: "10s", target: 1000 },  // ramp up to 1,000 VUs over 10s
        { duration: "40s", target: 1000 },  // hold at 1,000 VUs for 40s
        { duration: "10s", target: 0 },     // ramp down over 10s
    ],
    thresholds: {
        ws_roundtrip_latency: ["p(95)<2000"],  // p95 latency must be under 2s
        ws_error_rate:        ["rate<0.01"],    // error rate under 1%
    },
    // JSON summary output
    summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

// ─── Main VU Scenario ────────────────────────────────────────────────────────
export default function () {
    const userId = `loadtest-user-${__VU}-${__ITER}`;
    const url = `${BASE_WS_URL}/socket.io/?EIO=4&transport=websocket&userId=${userId}`;

    const res = ws.connect(url, {}, function (socket) {
        let messageCounter = 0;
        let pendingSends = {};  // track send timestamps for latency measurement

        socket.on("open", () => {
            // Socket.io Engine.IO handshake — send upgrade probe
            // The server will reply with session info
        });

        socket.on("message", (data) => {
            // Engine.IO protocol:
            //   "0" = open (session info)
            //   "2" = ping
            //   "3" = pong
            //   "4" = message (Socket.io payload)
            //   "40" = Socket.io connect to default namespace

            if (data === "2") {
                // Respond to server ping with pong
                socket.send("3");
                return;
            }

            if (data.startsWith("0")) {
                // Engine.IO open packet — send Socket.io connect
                socket.send("40");
                return;
            }

            if (data === "40") {
                // Socket.io connected to namespace — start sending messages
                socket.setInterval(() => {
                    const msgId = `${userId}-${messageCounter++}`;
                    const timestamp = Date.now();
                    pendingSends[msgId] = timestamp;

                    // Emit "sendMessage" event with a test payload
                    // Socket.io event format: 42["eventName", {payload}]
                    const payload = JSON.stringify([
                        "sendMessage",
                        {
                            sender: userId,
                            recipient: `echo-target-${__VU}`,
                            content: `Load test message ${msgId}`,
                            messageType: "text",
                            _loadTestId: msgId,
                            _loadTestTs: timestamp,
                        },
                    ]);
                    socket.send(`42${payload}`);
                    wsMessagesSent.add(1);
                }, SEND_INTERVAL_SEC * 1000);

                return;
            }

            // Handle Socket.io event messages (prefix "42")
            if (data.startsWith("42")) {
                wsMessagesRecv.add(1);

                try {
                    const jsonStr = data.substring(2);
                    const parsed = JSON.parse(jsonStr);

                    // Check if this is a response we can measure latency for
                    if (Array.isArray(parsed) && parsed.length >= 2) {
                        const eventPayload = parsed[1];
                        if (
                            eventPayload &&
                            eventPayload._loadTestId &&
                            pendingSends[eventPayload._loadTestId]
                        ) {
                            const latency = Date.now() - pendingSends[eventPayload._loadTestId];
                            wsRoundTrip.add(latency);
                            delete pendingSends[eventPayload._loadTestId];
                        }
                    }
                } catch (e) {
                    // Some messages may not be parseable — that's fine
                }

                wsErrors.add(false); // successful message
                return;
            }
        });

        socket.on("error", (e) => {
            wsErrors.add(true);
            wsConnectErrors.add(1);
            console.error(`[VU ${__VU}] WebSocket error: ${e}`);
        });

        socket.on("close", () => {
            // Connection closed
        });

        // Keep the connection alive for the full test duration
        // k6 ws.connect will keep the socket open until this fn returns
        socket.setTimeout(() => {
            socket.close();
        }, 55000); // slightly under the full 60s to allow graceful close
    });

    check(res, {
        "WebSocket connection established": (r) => r && r.status === 101,
    });

    if (!res || res.status !== 101) {
        wsErrors.add(true);
        wsConnectErrors.add(1);
    }
}

// ─── Summary Handler — outputs JSON report ──────────────────────────────────
export function handleSummary(data) {
    const summary = {
        timestamp: new Date().toISOString(),
        test: "EchoRoom WebSocket Load Test",
        config: {
            maxVUs: 1000,
            duration: "60s",
            sendInterval: `${SEND_INTERVAL_SEC}s`,
        },
        metrics: {
            roundTripLatency: {
                p95: data.metrics.ws_roundtrip_latency
                    ? data.metrics.ws_roundtrip_latency.values["p(95)"]
                    : null,
                p99: data.metrics.ws_roundtrip_latency
                    ? data.metrics.ws_roundtrip_latency.values["p(99)"]
                    : null,
                avg: data.metrics.ws_roundtrip_latency
                    ? data.metrics.ws_roundtrip_latency.values.avg
                    : null,
                med: data.metrics.ws_roundtrip_latency
                    ? data.metrics.ws_roundtrip_latency.values.med
                    : null,
                max: data.metrics.ws_roundtrip_latency
                    ? data.metrics.ws_roundtrip_latency.values.max
                    : null,
            },
            errorRate: data.metrics.ws_error_rate
                ? data.metrics.ws_error_rate.values.rate
                : 0,
            messagesSent: data.metrics.ws_messages_sent
                ? data.metrics.ws_messages_sent.values.count
                : 0,
            messagesReceived: data.metrics.ws_messages_received
                ? data.metrics.ws_messages_received.values.count
                : 0,
            connectErrors: data.metrics.ws_connect_errors
                ? data.metrics.ws_connect_errors.values.count
                : 0,
        },
        thresholds: {
            p95LatencyUnder2s: data.metrics.ws_roundtrip_latency
                ? data.metrics.ws_roundtrip_latency.thresholds["p(95)<2000"]?.ok ?? false
                : false,
            errorRateUnder1Percent: data.metrics.ws_error_rate
                ? data.metrics.ws_error_rate.thresholds["rate<0.01"]?.ok ?? false
                : false,
        },
    };

    return {
        "load-test/results.json": JSON.stringify(summary, null, 2),
        stdout: JSON.stringify(summary, null, 2) + "\n",
    };
}
