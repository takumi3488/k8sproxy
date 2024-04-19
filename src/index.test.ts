import { describe, expect, test } from "bun:test";
import app, { PASSWORD } from ".";

const password = atob(PASSWORD as string);

describe("Public page", () => {
	test("without host", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(400);
	});

	test("public page", async () => {
		const res = await app.request("/", {
			headers: {
				host: "public.example.com",
			},
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toContain("Welcome to nginx!");
	})

	test("cors", async () => {
		const res = await app.request("/", {
			headers: {
				host: "public.example.com",
				origin: "https://third.example.com",
			},
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://third.example.com");
		expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
	});
})

describe("Private", () => {
	test("without host", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(400);
	});

	test("redirect when not logged in", async () => {
		const res = await app.request("/", {
			headers: {
				host: "private.example.com",
			},
		});
		expect(res.status).toBe(302);
	});

	test("login page", async () => {
		const res = await app.request("/k8sproxy/login", {
			headers: {
				host: "private.example.com",
			},
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toContain("Login to k8sproxy");
	});

	test("login", async () => {
		const res = await app.request("/k8sproxy/login", {
			method: "POST",
			headers: {
				host: "private.example.com",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				password,
			}),
		});
		expect(res.status).toBe(302);
		expect(res.headers.get("Set-Cookie")).toContain("session_id=");
		console.log(res.headers.get("Set-Cookie"));
		const sessionId = res.headers
			.get("Set-Cookie")
			?.match(/session_id=([^;]+)/)?.[1];
		expect(sessionId).toBeTruthy();

		const res2 = await app.request("/", {
			headers: {
				host: "private.example.com",
				cookie: `session_id=${sessionId};`,
			},
		});
		expect(res2.status).toBe(200);
		expect(await res2.text()).toContain("Welcome to nginx!");

		const res3 = await app.request("/", {
			headers: {
				host: "k8sproxy.example.com",
				cookie: `session_id=${sessionId};`,
			},
		});
		expect(res3.status).toBe(200);
		expect(await res3.text()).toContain("k8sproxy pages");
	});
});
