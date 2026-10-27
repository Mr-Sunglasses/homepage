import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import {
	originalKey,
	variantKey,
	variantWidths,
} from "../src/lib/photo-keys.mjs";
import { checkPage } from "./check-built.mjs";
import { privateMetadata } from "./check-image-metadata.mjs";
import { parseListObjects } from "./photos/stores.mjs";
import {
	distanceKm,
	nearestPlace,
	readTrip,
	writeTrip,
} from "./photos/trips.mjs";
import { exifDateTime } from "./photos-import.mjs";
import { compare, expectedFiles } from "./photos-verify.mjs";

test("variant widths never upscale", () => {
	assert.deepEqual(variantWidths(6000), [640, 1280, 2048]);
	assert.deepEqual(variantWidths(1500), [640, 1280]);
	assert.deepEqual(variantWidths(500), [500]);
});

test("store keys", () => {
	assert.equal(
		variantKey("2026-10-ladakh", "abc123abc123", 640, "avif"),
		"trips/2026-10-ladakh/abc123abc123-640.avif",
	);
	assert.equal(
		originalKey("2026-10-ladakh", "abc123abc123", "heic"),
		"trips/2026-10-ladakh/abc123abc123.heic",
	);
});

test("camera time is kept as recorded, without a zone", () => {
	assert.equal(exifDateTime("2026:09:12 07:41:00"), "2026-09-12T07:41:00");
	assert.equal(exifDateTime(undefined), undefined);
	assert.equal(exifDateTime("garbage"), undefined);
});

test("nearest trip place within 60 km, by name only", () => {
	const places = [
		{ name: "Leh", lat: 34.15, lng: 77.58 },
		{ name: "Nubra Valley", lat: 34.6, lng: 77.6 },
	];
	assert.equal(nearestPlace(places, { lat: 34.16, lng: 77.58 }), "Leh");
	assert.equal(nearestPlace(places, { lat: 28.61, lng: 77.21 }), undefined);
	assert.ok(
		Math.abs(
			distanceKm({ lat: 28.61, lng: 77.21 }, { lat: 19.08, lng: 72.88 }) - 1150,
		) < 20,
	);
});

test("ListObjectsV2 parsing, with paging and escaped keys", () => {
	const xml = `<ListBucketResult><IsTruncated>true</IsTruncated>
		<Contents><Key>trips/a&amp;b/x-640.avif</Key><ETag>&quot;abc&quot;</ETag><Size>12</Size></Contents>
		<Contents><Key>trips/a/y.jpg</Key><ETag>"def"</ETag><Size>34</Size></Contents>
		<NextContinuationToken>tok/1=</NextContinuationToken></ListBucketResult>`;
	const page = parseListObjects(xml);
	assert.deepEqual(page.objects[0], {
		key: "trips/a&b/x-640.avif",
		etag: "abc",
		size: 12,
	});
	assert.equal(page.objects.length, 2);
	assert.equal(page.nextToken, "tok/1=");
	assert.equal(
		parseListObjects("<IsTruncated>false</IsTruncated>").nextToken,
		undefined,
	);
});

test("verify finds missing, differing and extra files", () => {
	const trips = [
		{ slug: "t", photos: [{ id: "aaaaaaaaaaaa", ext: "jpg", widths: [640] }] },
	];
	const expected = expectedFiles(trips);
	assert.equal(expected.length, 3); // original + 640 avif + 640 webp
	const full = (etag) => ({
		photos: new Map([
			["trips/t/aaaaaaaaaaaa-640.avif", { etag }],
			["trips/t/aaaaaaaaaaaa-640.webp", { etag }],
		]),
		originals: new Map([["trips/t/aaaaaaaaaaaa.jpg", { etag }]]),
	});
	assert.deepEqual(compare(expected, { r2: full("1"), vps: full("1") }), {
		missing: [],
		differ: [],
		extra: [],
	});

	const vps = full("1");
	vps.originals.clear();
	vps.photos.set("trips/old/zzz-640.avif", { etag: "9" });
	const result = compare(expected, { r2: full("2"), vps });
	assert.deepEqual(result.missing, [
		{
			bucket: "originals",
			key: "trips/t/aaaaaaaaaaaa.jpg",
			present: ["r2"],
			absent: ["vps"],
		},
	]);
	assert.equal(result.differ.length, 2);
	assert.deepEqual(result.extra, [
		{ store: "vps", bucket: "photos", key: "trips/old/zzz-640.avif" },
	]);
});

test("trip files keep their body and get a block-style photo list", () => {
	const dir = mkdtempSync(join(tmpdir(), "trip-"));
	const path = join(dir, "index.md");
	writeFileSync(
		path,
		"---\ntitle: Ladakh\n# a comment\nphotos: []\n---\n\nThe story.\n",
	);
	const trip = readTrip(path);
	trip.doc.addIn(["photos"], { id: "aaaaaaaaaaaa", alt: "" });
	trip.doc.get("photos").flow = false;
	writeTrip(path, trip);
	const text = readFileSync(path, "utf8");
	assert.match(text, /# a comment/);
	assert.match(text, /photos:\n {2}- id: aaaaaaaaaaaa\n/);
	assert.match(text, /---\n\nThe story\.\n$/);
});

test("built pages: no scripts, alt text required", () => {
	assert.deepEqual(checkPage("a.html", '<img src="x.webp" alt="A lake">'), []);
	assert.equal(checkPage("a.html", '<img src="x.webp" alt="">').length, 1);
	assert.equal(checkPage("a.html", '<img src="x.webp">').length, 1);
	assert.equal(checkPage("a.html", "<script>alert(1)</script>").length, 1);
});

test("private metadata is detected", async () => {
	const plain = await sharp({
		create: { width: 8, height: 8, channels: 3, background: "#888" },
	})
		.jpeg()
		.toBuffer();
	assert.deepEqual(await privateMetadata(plain), []);
	const tagged = await sharp(plain)
		.withExif({
			IFD0: { Artist: "Someone" },
			IFD3: {
				GPSLatitudeRef: "N",
				GPSLatitude: "34/1 9/1 0/1",
				GPSLongitudeRef: "E",
				GPSLongitude: "77/1 34/1 0/1",
			},
		})
		.toBuffer();
	assert.deepEqual(await privateMetadata(tagged), ["GPS", "Artist"]);
});
