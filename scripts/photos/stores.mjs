// The photo stores (Cloudflare R2, the VPS's Garage), configured from env:
//
//   PHOTO_STORES=r2,vps
//   R2_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
//   R2_S3_REGION=auto
//   R2_S3_ACCESS_KEY_ID=…
//   R2_S3_SECRET_ACCESS_KEY=…
//   R2_PHOTOS_BUCKET=photos         (default)
//   R2_ORIGINALS_BUCKET=originals   (default)
//   …and the same with VPS_ for the second store.
import { AwsClient } from "aws4fetch";

export function loadStores(env = process.env) {
	const names = (env.PHOTO_STORES ?? "")
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean);
	if (names.length === 0) {
		throw new Error("PHOTO_STORES is not set. See .env.example.");
	}
	return names.map((name) => {
		const prefix = name.toUpperCase();
		const get = (key, fallback) => {
			const value = env[`${prefix}_${key}`] ?? fallback;
			if (value === undefined) throw new Error(`${prefix}_${key} is not set`);
			return value;
		};
		return new Store({
			name,
			endpoint: get("S3_ENDPOINT").replace(/\/$/, ""),
			region: get("S3_REGION", "auto"),
			accessKeyId: get("S3_ACCESS_KEY_ID"),
			secretAccessKey: get("S3_SECRET_ACCESS_KEY"),
			buckets: {
				photos: get("PHOTOS_BUCKET", "photos"),
				originals: get("ORIGINALS_BUCKET", "originals"),
			},
		});
	});
}

export class Store {
	constructor({
		name,
		endpoint,
		region,
		accessKeyId,
		secretAccessKey,
		buckets,
	}) {
		this.name = name;
		this.endpoint = endpoint;
		this.buckets = buckets;
		this.client = new AwsClient({
			accessKeyId,
			secretAccessKey,
			region,
			service: "s3",
		});
	}

	// Path-style URLs work on both R2 and Garage.
	url(bucket, key = "", query = "") {
		const path = key
			.split("/")
			.map((part) => encodeURIComponent(part))
			.join("/");
		return `${this.endpoint}/${this.buckets[bucket]}/${path}${query}`;
	}

	async request(method, bucket, key, init = {}, query = "") {
		const response = await this.client.fetch(this.url(bucket, key, query), {
			method,
			...init,
		});
		if (!response.ok && response.status !== 404) {
			const text = await response.text().catch(() => "");
			throw new Error(
				`${this.name}: ${method} ${bucket}/${key} failed (${response.status}) ${text.slice(0, 200)}`,
			);
		}
		return response;
	}

	async put(bucket, key, body, contentType, cacheControl) {
		const headers = { "content-type": contentType };
		if (cacheControl) headers["cache-control"] = cacheControl;
		await this.request("PUT", bucket, key, { body, headers });
	}

	async get(bucket, key) {
		const response = await this.request("GET", bucket, key);
		if (response.status === 404) return null;
		return {
			body: Buffer.from(await response.arrayBuffer()),
			contentType: response.headers.get("content-type") ?? undefined,
			cacheControl: response.headers.get("cache-control") ?? undefined,
		};
	}

	/** Every object under `prefix`: Map of key → { etag, size }. */
	async list(bucket, prefix) {
		const objects = new Map();
		let token;
		do {
			const params = new URLSearchParams({ "list-type": "2", prefix });
			if (token) params.set("continuation-token", token);
			const response = await this.request("GET", bucket, "", {}, `?${params}`);
			const page = parseListObjects(await response.text());
			for (const object of page.objects) objects.set(object.key, object);
			token = page.nextToken;
		} while (token);
		return objects;
	}
}

const unescapeXml = (text) =>
	text
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");

/** Parses a ListObjectsV2 response. */
export function parseListObjects(xml) {
	const objects = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(
		([, block]) => {
			const field = (name) =>
				unescapeXml(
					block.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? "",
				);
			return {
				key: field("Key"),
				etag: field("ETag").replaceAll('"', ""),
				size: Number(field("Size")),
			};
		},
	);
	const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
	const nextToken = truncated
		? unescapeXml(xml.match(/<NextContinuationToken>([^<]*)</)?.[1] ?? "")
		: undefined;
	return { objects, nextToken: nextToken || undefined };
}
