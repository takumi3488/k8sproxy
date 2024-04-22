import { randomUUID } from "crypto";
import { setCookie } from "hono/cookie";
import type { H } from "hono/types";
import { Login } from "../components/Login";
import redisClient from "../redis";

// Load environment variables
const { PASSWORD, NODE_ENV } = Bun.env;
if (!PASSWORD) {
	throw new Error("PASSWORD is not set");
}
if (!NODE_ENV) {
	throw new Error("NODE_ENV is not set");
}

// Login page
export const loginPageHandler: H = async (c) => c.html(<Login />);

// Login handler
export const loginHandler: H = async (c) => {
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
};
