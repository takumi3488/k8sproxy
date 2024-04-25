import { type Context, Hono, type Next } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { methodOverride } from "hono/method-override";
import { Layout } from "./components/Layout";
import { urlMapRepository } from "./db";
import { loginHandler, loginPageHandler } from "./handlers/login";
import { proxyHandler } from "./handlers/proxy";
import {
	addUrlMapHandler,
	deleteUrlMapHandler,
	updateUrlMapHandler,
} from "./handlers/url_mpas";
import redisClient from "./redis";

// Load environment variables
export const { PASSWORD, NODE_ENV, ALLOWED_ORIGINS, API_KEY } = Bun.env;
if (!PASSWORD) {
	throw new Error("PASSWORD is not set");
}
if (!ALLOWED_ORIGINS) {
	throw new Error("ALLOWED_ORIGINS is not set");
}

const app = new Hono();
app.use(
	cors({
		origin: ALLOWED_ORIGINS.split(","),
		maxAge: 600,
		credentials: true,
	}),
);
app.use(logger());

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
	if (NODE_ENV === "development") return next();
	const host = c.req.header("Host") as string;
	const subdomain = host.split(".")[0];
	const sessionId = getCookie(c, "session_id");
	const apiKey = c.req.header("x-api-key");
	if (
		!(sessionId && (await redisClient.get(`k8sproxy:sessions:${sessionId}`))) &&
		((subdomain in urlMapRepository.urlMaps &&
			urlMapRepository.urlMaps[subdomain].isSecure) ||
			subdomain === "k8sproxy") &&
		apiKey !== API_KEY
	) {
		return c.redirect("/k8sproxy/login");
	}
	await next();
};

// Static files
app.use("/styles.css", serveStatic({ path: "./styles.css" }));

// Login page
app.get(
	"/k8sproxy/login",
	async (c, next) => {
		// Check session ID
		const sessionId = getCookie(c, "session_id");
		if (await redisClient.get(`k8sproxy:sessions:${sessionId}`)) {
			return c.redirect("/");
		}
		await next();
	},
	loginPageHandler,
);

// Login post
app.post("/k8sproxy/login", loginHandler);

// Add URL map
app.post("/k8sproxy/url_maps", async (c, next) => {
	if (
		!c.req.header("Host")?.startsWith("k8sproxy.") &&
		NODE_ENV !== "development"
	) {
		return proxyHandler(c, next);
	}
	return addUrlMapHandler(c, next);
});

// Update URL map
app.post("/k8sproxy/url_maps/:subdomain", async (c, next) => {
	if (
		!c.req.header("Host")?.startsWith("k8sproxy.") &&
		NODE_ENV !== "development"
	) {
		return proxyHandler(c, next);
	}
	const body = await c.req.parseBody();
	switch (body._method) {
		case "DELETE":
			return deleteUrlMapHandler(c, next);
		default:
			return updateUrlMapHandler(c, next);
	}
});

// Proxy
app.all("*", checkSessionID, proxyHandler);

console.log(`NODE_ENV=${NODE_ENV}`);

export default app;
