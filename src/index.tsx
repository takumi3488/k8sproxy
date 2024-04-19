import { randomUUID } from "crypto";
import { Context, Hono, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createClient } from "redis";
import { Index } from "./components/Index";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import postgres from 'postgres'

// Load environment variables
export const { PASSWORD, REDIS_URL, POSTGRES_URL, NODE_ENV } = Bun.env;
if (!PASSWORD) {
	throw new Error("PASSWORD is not set");
}
if (!REDIS_URL) {
	throw new Error("REDIS_URL is not set");
}
if (!POSTGRES_URL) {
	throw new Error("POSTGRES_URL is not set");
}

// Redis client
const redisClient = createClient({ url: REDIS_URL });
redisClient.on("error", (err) => console.error(err));
await redisClient.connect();

// Postgres client
const sql = postgres(POSTGRES_URL, {
	transform: postgres.toCamel
});

// Get Initial URL map
interface UrlMap {
	subdomain: string;
	proxyTo: string;
	isSecure: boolean;
}
const urlMaps = Object.fromEntries(
	((await sql<UrlMap[]>`SELECT * FROM url_maps`) || [])
		.map((urlMap) => [urlMap.subdomain, { proxyTo: urlMap.proxyTo, isSecure: urlMap.isSecure }])
);
console.log("Initial URL map", urlMaps);

// Update URL map every minute
setInterval(async () => {
	const newUrlMaps = Object.fromEntries(
		((await sql<UrlMap[]>`SELECT * FROM url_maps`) || [])
			.map((urlMap) => [urlMap.subdomain, { proxyTo: urlMap.proxyTo, isSecure: urlMap.isSecure }])
	);
	const keys = Object.keys(urlMaps);
	const newKeys = Object.keys(newUrlMaps);
	for (const key of keys) {
		if (!newKeys.includes(key)) {
			delete urlMaps[key];
		}
	}
	for (const key of newKeys) {
		if (!keys.includes(key)) {
			urlMaps[key] = newUrlMaps[key];
		}
	}
	console.log("Updated URL map", urlMaps);
}, 1000 * 60);

const app = new Hono();
app.use(logger());
app.use(cors());

// Check host
app.use("*", async (c, next) => {
	const host = c.req.header("Host");
	if (!host) {
		return c.html(<Layout>400: Bad request</Layout>, 400);
	}
	await next();
});

// Check session ID
const checkSessionID = async (c: Context, next: Next) => {
	const host = c.req.header("Host") as string;
	const subdomain = host.split(".")[0];
	if (subdomain === "k8sproxy") {
		return await next();
	}
	const urlMap = urlMaps[subdomain];
	const sessionId = getCookie(c, "session_id");
	if (
		!(sessionId && (await redisClient.get(`k8sproxy:sessions:${sessionId}`))) && urlMap.isSecure
	) {
		return c.redirect("/login");
	}
	await next();
};

// Login page
app.get(
	"/login",
	async (c, next) => {
		// Check session ID
		const sessionId = getCookie(c, "session_id");
		if (await redisClient.get(`k8sproxy:sessions:${sessionId}`)) {
			return c.redirect("/");
		}
		await next();
	},
	async (c) => c.html(<Login />),
);

// Login post
app.post("/login", async (c) => {
	const { password } = await c.req.parseBody();

	// Check password
	if (typeof password !== "string" || btoa(password) !== PASSWORD) {
		return c.html(<Login msg="Invalid password" />, 401);
	}

	// Set session ID
	const sessionId = randomUUID({});
	redisClient.set(`k8sproxy:sessions:${sessionId}`, sessionId, {
		EX: 60 * 60 * 24 * 30,
	});
	setCookie(c, "session_id", sessionId, {
		path: "/",
		secure: NODE_ENV === "production",
		domain: new URL(c.req.url).hostname.split(".").slice(-2).join("."),
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 30,
		sameSite: NODE_ENV === "production" ? "None" : "Lax",
	});
	return c.redirect("/");
});

app.all("*", checkSessionID, async (c) => {
	// Rewrite only the URL portion and proxy it.
	const host = c.req.header("Host") as string;
	const subdomain = host.split(".")[0];
	const domain = host.split(".").slice(1).join(".");
	if (subdomain === "k8sproxy") {
		return c.html(<Index paths={Object.keys(urlMaps).map(urlMap=>`https://${urlMap}.${domain}`)} />);
	}
	const url = urlMaps[subdomain].proxyTo + c.req.path;
	const raw = c.req.raw;
	const req = new Request(`${url}`, {
		method: raw.method,
		headers: raw.headers,
		body: raw.body,
		referrer: raw.referrer,
	});
	return fetch(req);
});

export default app;
