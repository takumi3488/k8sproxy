import { createClient } from "redis";

// Load environment variables
const { REDIS_URL } = Bun.env;
if (!REDIS_URL) {
	throw new Error("REDIS_URL is not set");
}

// Redis client
const redisClient = createClient({ url: REDIS_URL });
redisClient.on("error", (err) => console.error(err));
await redisClient.connect();

export default redisClient;
