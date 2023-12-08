import { describe, expect, test } from "bun:test";
import app, { PASSWORD } from ".";

const password = atob(PASSWORD!);

describe("E2E", () => {
	test("without host", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(400);
	});

	test("redirect when not logged in", async () => {
		const res = await app.request("/", {
			headers: {
				host: "nginx",
			},
		});
		expect(res.status).toBe(302);
	});

	test("login page", async () => {
		const res = await app.request("/login", {
			headers: {
				host: "nginx",
			},
		});
		expect(res.status).toBe(200);
		expect(await res.text()).toContain("Login to k8sproxy");
	});

	test("login", async () => {
		// ログインのテスト
		const res = await app.request("/login", {
			method: "POST",
			headers: {
				host: "nginx",
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

		// ログイン後のページのテスト
		const res2 = await app.request("/", {
			headers: {
				host: "k8sproxy",
				cookie: `session_id=${sessionId};`,
			},
		});
		expect(res2.status).toBe(200);
		expect(await res2.text()).toContain("k8sproxy pages");

		// プロキシのテスト
		const res3 = await app.request("/", {
			headers: {
				host: "nginx",
				cookie: `session_id=${sessionId};`,
			},
		});
		expect(res3.status).toBe(200);
		expect(await res3.text()).toContain("Welcome to nginx!");
	});
});
