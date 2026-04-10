import express from "express";
import { createClient } from "redis";

const app = express();
const PORT = 3000;

// Simple request logger to help debugging incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} -> ${req.method} ${req.url}`);
  next();
});

// 🔌 Redis Client
const redisClient = createClient({
  url: "redis://default:74QBBuzB9ETm1Tcq4OFj1AeKE9djN3K8@redis-16775.crce214.us-east-1-3.ec2.cloud.redislabs.com:16775",
  socket: {
    rejectUnauthorized: false
  }
});

redisClient.on("error", (err) => console.log("Redis Error:", err));

// Try to connect to Redis but don't crash the server if it fails.
try {
  await redisClient.connect();
  console.log("✅ Connected to Redis");
} catch (err) {
  console.log("⚠️ Redis connection failed:", err.message);
}

// 🧪 Fake DB function (simulate delay)
const getUserFromDB = async (id) => {
  console.log("⏳ Fetching from DB...");
  await new Promise((res) => setTimeout(res, 2000)); // simulate delay
  return { id, name: "Hari", role: "Developer" };
};

// Basic routes for quick testing / health checks
app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!', timestamp: new Date().toISOString() });
});

// Safe process handlers
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // optional: exit or keep running depending on your deployment strategy
  process.exit(1);
});

// 🚀 API with caching
app.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // 1️⃣ Check cache
    const cachedData = await redisClient.get(`user:${id}`);

    if (cachedData) {
      console.log("⚡ From Cache");
      return res.json(JSON.parse(cachedData));
    }

    // 2️⃣ Fetch from DB
    const user = await getUserFromDB(id);

    // 3️⃣ Store in Redis (with expiry 60 sec)
    await redisClient.setEx(`user:${id}`, 60, JSON.stringify(user));

    console.log("💾 Saved to Cache");

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});