import type { H } from "hono/types";
import { Index } from "../components/Index";
import { urlMapRepository } from "../db";

const queriesToUrlString = (queries: Record<string, string[]>): string => {
	const keys = Object.keys(queries);
	if (keys.length === 0) return "";
	const q = keys.map((key) => queries[key].map((v) => `${key}=${v}`).join("&")).join("&");
	return `?${q}`;
}

export const proxyHandler: H = async (c) => {
	// Rewrite only the URL portion and proxy it.
	const host = c.req.header("Host") as string;
	const subdomain = host.split(".")[0];
	const domain = host.split(".").slice(1).join(".");
	if (subdomain === "k8sproxy" || Bun.env.NODE_ENV === "development") {
		return c.html(
			<Index urlMapRepository={urlMapRepository} domain={domain} />,
		);
	}
	const raw = c.req.raw;
	const url = urlMapRepository.urlMaps[subdomain].proxyTo + queriesToUrlString(c.req.queries());
	raw.headers.set(
		"host",
		urlMapRepository.urlMaps[subdomain].proxyTo
			.replace(/^https?:\/\//, "")
			.split("/")[0],
	);
	raw.headers.delete("origin");
	const req = new Request(url, {
		method: raw.method,
		headers: raw.headers,
		body: raw.body,
		credentials: raw.credentials,
	});
	return fetch(req);
};
