import { Context, Hono, Next } from "hono";
import { getCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from 'hono/bun'
import { Layout } from "./components/Layout";
import { methodOverride } from "hono/method-override";
import { urlMapRepository } from "./db";
import { proxyHandler } from "./handlers/proxy";
import redisClient from "./redis";
import { loginHandler, loginPageHandler } from "./handlers/login";
import { addUrlMapHandler, deleteUrlMapHandler, updateUrlMapHandler } from "./handlers/url_mpas";

// Load environment variables
export const { PASSWORD, NODE_ENV, ALLOWED_ORIGINS } =
	Bun.env;
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
app.use(logger())

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
	if (
		!(sessionId && (await redisClient.get(`k8sproxy:sessions:${sessionId}`))) &&
		(subdomain in urlMapRepository.urlMaps && urlMapRepository.urlMaps[subdomain].isSecure || subdomain === "k8sproxy")
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
	loginPageHandler
);

// Login post
app.post("/k8sproxy/login", loginHandler);

// Add URL map
app.post("/k8sproxy/url_maps", async (c, next) => {
	if (c.req.header("Host") !== "k8sproxy" && NODE_ENV !== "development") {
		return proxyHandler(c, next)
	}
	return addUrlMapHandler(c, next);
})

// Update URL map
app.post("/k8sproxy/url_maps/:subdomain", async (c, next) => {
	if (c.req.header("Host") !== "k8sproxy" && NODE_ENV !== "development") {
		return proxyHandler(c, next)
	}
	const body = await c.req.parseBody();
	switch (body._method) {
		case "DELETE":
			return deleteUrlMapHandler(c, next);
		default:
			return updateUrlMapHandler(c, next);
	}
})

// Proxy
app.all("*", checkSessionID, proxyHandler);

console.log(`NODE_ENV=${NODE_ENV}`);

export default app;
