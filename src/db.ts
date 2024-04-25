import postgres from "postgres";

// Check if POSTGRES_URL is set
const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
	throw new Error("POSTGRES_URL is not set");
}

// Postgres client
const sql = postgres(POSTGRES_URL, {
	transform: postgres.toCamel,
});

// Interface for URL map
export interface Subdomain {
	subdomain: string;
	proxyTo: string;
	isSecure: boolean;
}

// URL map class
interface UrlMapInterface {
	[k: string]: {
		proxyTo: string;
		isSecure: boolean;
	};
}
export class UrlMapRepository {
	urlMaps: {
		[k: string]: {
			proxyTo: string;
			isSecure: boolean;
		};
	};

	constructor(urlMaps: UrlMapInterface = {}) {
		this.urlMaps = urlMaps;
	}

	async deleteUrlMap(subdomain: string) {
		await sql`DELETE FROM url_maps WHERE subdomain = ${subdomain}`;
		delete this.urlMaps[subdomain];
		console.log(`Deleted: ${JSON.stringify(this.urlMaps, null, 2)}`);
	}

	async addUrlMap(subdomain: Subdomain) {
		await sql`INSERT INTO url_maps ${sql(subdomain)}`;
		this.urlMaps[subdomain.subdomain] = subdomain;
		console.log(`Added ${JSON.stringify(this.urlMaps, null, 2)}`);
	}

	async updateUrlMap(subdomain: Subdomain) {
		await sql`UPDATE url_maps SET ${sql(subdomain)} WHERE subdomain = ${
			subdomain.subdomain
		}`;
		this.urlMaps[subdomain.subdomain] = subdomain;
		console.log(`Updated ${JSON.stringify(this.urlMaps, null, 2)}`);
	}
}

// Get Initial URL map
const urlMapsResponse: UrlMapInterface = Object.fromEntries(
	((await sql<Subdomain[]>`SELECT * FROM url_maps`) || []).map((urlMap) => [
		urlMap.subdomain,
		{ proxyTo: urlMap.proxyTo, isSecure: urlMap.isSecure },
	]),
);
export const urlMapRepository = new UrlMapRepository(urlMapsResponse);
