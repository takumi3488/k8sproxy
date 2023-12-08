import { randomUUID } from "crypto";
import { Context, Hono, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createClient } from "redis";
import { Index } from "./components/Index";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";

// Load environment variables
export const { PASSWORD, URL_MAP, REDIS_URL, NODE_ENV } = process.env;
if (!PASSWORD) {
	throw new Error("PASSWORD is not set");
}
if (!URL_MAP) {
	throw new Error("URL_MAP is not set");
}
if (!REDIS_URL) {
	throw new Error("REDIS_URL is not set");
}
export const urlMap: { [key: string]: string } = JSON.parse(URL_MAP);

// Redis client
const redisClient = createClient({ url: REDIS_URL });
redisClient.on("error", (err) => console.error(err));
await redisClient.connect();

const app = new Hono();

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
	const sessionId = getCookie(c, "session_id");
	if (
		!(sessionId && (await redisClient.get(`k8sproxy:sessions:${sessionId}`)))
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
	const host = c.req.header("Host")!;
	const subdomain = host.split(".")[0];
	if (subdomain === "k8sproxy") {
		return c.html(<Index paths={Object.keys(urlMap)} />);
	}
	const url = urlMap[host.split(".")[0]];
	const raw = c.req.raw;
	const req = new Request(`${url}`, { ...raw });
	return fetch(req);
});

export default app;
