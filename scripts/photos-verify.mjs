#!/usr/bin/env node
// Checks that every photo on every trip is in every photo store, and that
// the stores agree with each other.
//
//   pnpm photos:verify            report only; exits 1 on any problem
//   pnpm photos:verify --repair   copy missing files from a store that has them
import { existsSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { FORMATS, originalKey, variantKey } from "../src/lib/photo-keys.mjs";
import { loadStores } from "./photos/stores.mjs";
import { readTrip } from "./photos/trips.mjs";

/** Every file the trips expect, as { bucket, key }. */
export function expectedFiles(trips) {
	return trips.flatMap(({ slug, photos }) =>
		photos.flatMap((photo) => [
			{ bucket: "originals", key: originalKey(slug, photo.id, photo.ext) },
			...photo.widths.flatMap((width) =>
				FORMATS.map((format) => ({
					bucket: "photos",
					key: variantKey(slug, photo.id, width, format),
				})),
			),
		]),
	);
}

/**
 * Compares store listings against the expected files.
 * `listings` is { [store]: { photos: Map, originals: Map } }.
 */
export function compare(expected, listings) {
	const stores = Object.keys(listings);
	const missing = [];
	const differ = [];
	for (const { bucket, key } of expected) {
		const present = stores.filter((s) => listings[s][bucket].has(key));
		const absent = stores.filter((s) => !listings[s][bucket].has(key));
		if (absent.length > 0) missing.push({ bucket, key, present, absent });
		const etags = new Set(
			present.map((s) => listings[s][bucket].get(key).etag),
		);
		if (etags.size > 1) differ.push({ bucket, key });
	}
	const wanted = new Set(expected.map(({ bucket, key }) => `${bucket}/${key}`));
	const extra = stores.flatMap((store) =>
		["photos", "originals"].flatMap((bucket) =>
			[...listings[store][bucket].keys()]
				.filter((key) => !wanted.has(`${bucket}/${key}`))
				.map((key) => ({ store, bucket, key })),
		),
	);
	return { missing, differ, extra };
}

function loadTrips() {
	return ["src/content/trips", "drafts/trips"]
		.filter((dir) => existsSync(dir))
		.flatMap((dir) =>
			readdirSync(dir)
				.filter((slug) => existsSync(`${dir}/${slug}/index.md`))
				.map((slug) => {
					const { doc } = readTrip(`${dir}/${slug}/index.md`);
					return { slug, photos: doc.get("photos")?.toJSON() ?? [] };
				}),
		);
}

async function main() {
	const { values } = parseArgs({
		options: { repair: { type: "boolean", default: false } },
	});
	const stores = loadStores();
	const trips = loadTrips();
	const expected = expectedFiles(trips);
	const listings = {};
	for (const store of stores) {
		listings[store.name] = {
			photos: await store.list("photos", "trips/"),
			originals: await store.list("originals", "trips/"),
		};
	}
	const { missing, differ, extra } = compare(expected, listings);
	const photoCount = trips.reduce((n, t) => n + t.photos.length, 0);
	console.log(
		`${trips.length} trip(s), ${photoCount} photo(s), ${expected.length} file(s) expected in each of: ${stores.map((s) => s.name).join(", ")}`,
	);

	for (const { bucket, key, absent } of missing) {
		console.log(`  missing  ${bucket}/${key} in ${absent.join(", ")}`);
	}
	for (const { bucket, key } of differ) {
		console.log(`  differs  ${bucket}/${key}: stores hold different content`);
	}
	if (extra.length > 0) {
		console.log(
			`  (${extra.length} file(s) in stores that no trip uses; left alone)`,
		);
	}

	if (values.repair) {
		const byName = Object.fromEntries(stores.map((s) => [s.name, s]));
		let repaired = 0;
		for (const { bucket, key, present, absent } of missing) {
			if (present.length === 0) continue;
			const object = await byName[present[0]].get(bucket, key);
			for (const name of absent) {
				await byName[name].put(
					bucket,
					key,
					object.body,
					object.contentType,
					object.cacheControl,
				);
				console.log(`  copied   ${bucket}/${key}: ${present[0]} → ${name}`);
				repaired++;
			}
		}
		const lost = missing.filter((m) => m.present.length === 0);
		for (const { bucket, key } of lost) {
			console.log(
				`  LOST     ${bucket}/${key} is in no store; re-import that photo`,
			);
		}
		const ok = lost.length === 0 && differ.length === 0;
		console.log(
			ok
				? `\nRepaired ${repaired} file(s). All stores complete.`
				: "\nSome problems need a manual fix.",
		);
		process.exit(ok ? 0 : 1);
	}

	const ok = missing.length === 0 && differ.length === 0;
	console.log(
		ok
			? "\nAll stores complete and identical."
			: "\nRun with --repair to copy missing files.",
	);
	process.exit(ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error.message);
		process.exit(1);
	});
}
