#!/usr/bin/env node
// Refuses images in git that carry private metadata: GPS position, camera
// or lens serial numbers, owner or artist names. Built pages never include
// it (images are re-encoded), but the source files in the repo would.
//   node scripts/check-image-metadata.mjs --staged   pre-commit hook
//   node scripts/check-image-metadata.mjs            CI: every tracked image
//   node scripts/check-image-metadata.mjs --fix <files…>   strip it (re-encodes)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import exifr from "exifr";
import sharp from "sharp";

const IMAGE = /\.(jpe?g|png|webp|tiff?|heic|heif|avif)$/i;
const PRIVATE_KEYS = [
	"SerialNumber",
	"BodySerialNumber",
	"LensSerialNumber",
	"InternalSerialNumber",
	"OwnerName",
	"CameraOwnerName",
	"Artist",
];

export async function privateMetadata(buffer) {
	const data = await exifr
		.parse(buffer, { gps: true, tiff: true, exif: true, xmp: false })
		.catch(() => null);
	if (!data) return [];
	const found = PRIVATE_KEYS.filter((key) => data[key]);
	if (Number.isFinite(data.latitude)) found.unshift("GPS");
	return found;
}

// Staged images can be large; the default 1 MB output limit is too small.
const git = (...args) =>
	execFileSync("git", args, {
		encoding: "buffer",
		maxBuffer: 512 * 1024 * 1024,
	});

async function strip(path) {
	const input = readFileSync(path);
	const image = sharp(input).rotate();
	const format = (await image.metadata()).format;
	// Keep the colour profile, drop everything else.
	const output = await image
		.keepIccProfile()
		.toFormat(format, { quality: 95 })
		.toBuffer();
	writeFileSync(path, output);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const args = process.argv.slice(2);
	if (args[0] === "--fix") {
		for (const path of args.slice(1)) {
			await strip(path);
			console.log(`stripped ${path}`);
		}
		process.exit(0);
	}
	const staged = args.includes("--staged");
	const files = (
		staged
			? git("diff", "--cached", "--name-only", "--diff-filter=ACMR")
			: git("ls-files")
	)
		.toString()
		.split("\n")
		.filter((path) => IMAGE.test(path));
	const problems = [];
	for (const path of files) {
		const buffer = staged ? git("show", `:${path}`) : readFileSync(path);
		const found = await privateMetadata(buffer);
		if (found.length > 0) problems.push(`${path}: ${found.join(", ")}`);
	}
	if (problems.length > 0) {
		console.error("Images with private metadata:\n");
		for (const problem of problems) console.error(`  ${problem}`);
		console.error(
			"\nStrip it with: node scripts/check-image-metadata.mjs --fix <files…>",
		);
		process.exit(1);
	}
}
