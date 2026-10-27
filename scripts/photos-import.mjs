#!/usr/bin/env node
// Adds photos to a trip: strips metadata, makes web sizes, uploads to every
// photo store, and appends them to the trip's index.md.
//
//   pnpm photos:import ~/Pictures/ladakh --trip 2026-10-ladakh [--dry-run]
//
// Safe to re-run: photos already on the trip are skipped. A photo is only
// added to the trip once it is in every store, so a failed run leaves the
// trip consistent and can simply be run again.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import exifr from "exifr";
import sharp from "sharp";
import {
	FORMATS,
	originalKey,
	variantKey,
	variantWidths,
} from "../src/lib/photo-keys.mjs";
import { loadStores } from "./photos/stores.mjs";
import {
	nearestPlace,
	readTrip,
	tripPath,
	writeTrip,
} from "./photos/trips.mjs";

const IMAGE = /\.(jpe?g|png|webp|tiff?|heic|heif)$/i;
const IMMUTABLE = "public, max-age=31536000, immutable";
const QUALITY = { avif: { quality: 55 }, webp: { quality: 80 } };
const MIME = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	tif: "image/tiff",
	tiff: "image/tiff",
	heic: "image/heic",
	heif: "image/heif",
};

function listImages(inputs) {
	return inputs
		.flatMap((input) =>
			statSync(input).isDirectory()
				? readdirSync(input).map((name) => join(input, name))
				: [input],
		)
		.filter((path) => IMAGE.test(path) && !basename(path).startsWith("."))
		.sort();
}

// sharp can't decode HEIC (iPhone photos); on macOS, `sips` converts them.
// EXIF is kept by sips, so dates and places still work.
function readable(path, scratch) {
	if (!/\.hei[cf]$/i.test(path)) return path;
	if (process.platform !== "darwin") {
		throw new Error(`${path}: export HEIC photos as JPEG first`);
	}
	const out = join(scratch, `${basename(path, extname(path))}.jpg`);
	execFileSync(
		"sips",
		["-s", "format", "jpeg", "-s", "formatOptions", "95", path, "--out", out],
		{
			stdio: "ignore",
		},
	);
	return out;
}

/** "2026:09:12 07:41:00" → "2026-09-12T07:41:00" (no zone, as recorded). */
export function exifDateTime(value) {
	const m = String(value ?? "").match(
		/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
	);
	return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : undefined;
}

async function prepare(path, scratch, places) {
	const original = readFileSync(path);
	const sha256 = createHash("sha256").update(original).digest("hex");
	const ext = extname(path).slice(1).toLowerCase();
	const source = readFileSync(readable(path, scratch));

	const gps = await exifr.gps(source).catch(() => undefined);
	// Cameras record local wall-clock time with no zone. Read it raw so it
	// isn't shifted into this computer's time zone.
	const raw = await exifr
		.parse(source, { pick: ["DateTimeOriginal"], reviveValues: false })
		.catch(() => undefined);
	const takenAt = exifDateTime(raw?.DateTimeOriginal);
	// .rotate() applies the EXIF orientation; output carries no metadata.
	const oriented = sharp(source).rotate();
	const { data: pixels, info } = await oriented
		.clone()
		.toBuffer({ resolveWithObject: true });
	const { dominant } = await sharp(pixels).stats();
	const hex = (n) => n.toString(16).padStart(2, "0");

	const widths = variantWidths(info.width);
	const variants = [];
	for (const width of widths) {
		for (const format of FORMATS) {
			const body = await sharp(pixels)
				.resize({ width, withoutEnlargement: true })
				[format](QUALITY[format])
				.toBuffer();
			variants.push({ width, format, body });
		}
	}

	const hasGps =
		Number.isFinite(gps?.latitude) && Number.isFinite(gps?.longitude);
	const place = hasGps
		? nearestPlace(places, { lat: gps.latitude, lng: gps.longitude })
		: undefined;

	return {
		entry: {
			id: sha256.slice(0, 12),
			ext,
			width: info.width,
			height: info.height,
			widths,
			sha256,
			alt: "",
			...(takenAt && { takenAt }),
			...(place && { place }),
			color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
		},
		original,
		variants,
		hasGps,
	};
}

async function upload(stores, trip, photo) {
	const { entry, original, variants } = photo;
	// Every store gets every file; any failure stops before the trip is updated.
	await Promise.all(
		stores.flatMap((store) => [
			store.put(
				"originals",
				originalKey(trip, entry.id, entry.ext),
				original,
				MIME[entry.ext] ?? "application/octet-stream",
			),
			...variants.map(({ width, format, body }) =>
				store.put(
					"photos",
					variantKey(trip, entry.id, width, format),
					body,
					`image/${format}`,
					IMMUTABLE,
				),
			),
		]),
	);
}

async function main() {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			trip: { type: "string" },
			"dry-run": { type: "boolean", default: false },
		},
	});
	const trip = values.trip;
	if (!trip || positionals.length === 0) {
		throw new Error(
			"usage: pnpm photos:import <folder or files…> --trip <trip-folder-name>",
		);
	}
	const path = tripPath(trip);
	const file = readTrip(path);
	const places = file.doc.get("places", false)?.toJSON() ?? [];
	const known = new Set(
		(file.doc.get("photos")?.toJSON() ?? []).map((p) => p.id),
	);
	const stores = values["dry-run"] ? [] : loadStores();
	const images = listImages(positionals);
	if (images.length === 0) throw new Error("No images found.");

	console.log(
		`${images.length} image(s) → ${path}${values["dry-run"] ? " (dry run)" : ` → ${stores.map((s) => s.name).join(" + ")}`}`,
	);
	const scratch = mkdtempSync(join(tmpdir(), "photos-import-"));
	let added = 0;
	let skipped = 0;
	try {
		for (const image of images) {
			const photo = await prepare(image, scratch, places);
			const label = `${basename(image)} (${photo.entry.id})`;
			if (known.has(photo.entry.id)) {
				console.log(`  skip  ${label}: already on this trip`);
				skipped++;
				continue;
			}
			if (!values["dry-run"]) await upload(stores, trip, photo);

			if (!file.doc.has("photos")) file.doc.set("photos", []);
			file.doc.addIn(["photos"], photo.entry);
			// Keep the list in block style even if the file started as `photos: []`.
			file.doc.get("photos").flow = false;
			if (!file.doc.get("cover")) file.doc.set("cover", photo.entry.id);
			if (!values["dry-run"]) writeTrip(path, file);
			known.add(photo.entry.id);
			added++;

			const notes = [
				`${photo.entry.width}×${photo.entry.height}`,
				photo.entry.place ??
					(photo.hasGps ? "no trip place within 60 km" : "no GPS"),
				photo.hasGps ? "GPS removed" : null,
			].filter(Boolean);
			console.log(`  added ${label}: ${notes.join(", ")}`);
		}
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}

	console.log(`\n${added} added, ${skipped} already there.`);
	if (added > 0) {
		console.log(
			"Next: write alt text (and captions) for the new photos, in the admin panel or in",
		);
		console.log(`  ${path}`);
		console.log("A published trip with empty alt text fails the build.");
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error.message);
		process.exit(1);
	});
}
