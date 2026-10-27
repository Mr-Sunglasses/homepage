// Reading and writing a trip's index.md, where its photo list lives.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { parseDocument } from "yaml";

/** The trip file for `slug`, published or draft. */
export function tripPath(slug) {
	const candidates = [
		`src/content/trips/${slug}/index.md`,
		`drafts/trips/${slug}/index.md`,
	];
	const found = candidates.filter((path) => existsSync(path));
	if (found.length === 0) {
		throw new Error(
			`No trip "${slug}". Start one with: pnpm new trip "Title" --start YYYY-MM-DD --region india|world`,
		);
	}
	if (found.length > 1)
		throw new Error(`Trip "${slug}" exists twice: ${found.join(", ")}`);
	return found[0];
}

export function readTrip(path) {
	const text = readFileSync(path, "utf8");
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) throw new Error(`${path} has no frontmatter`);
	return { doc: parseDocument(match[1]), body: match[2] };
}

// Writes via a temporary file so an interrupted import never leaves a
// half-written trip behind.
export function writeTrip(path, { doc, body }) {
	const text = `---\n${String(doc).trimEnd()}\n---\n${body}`;
	writeFileSync(`${path}.tmp`, text);
	renameSync(`${path}.tmp`, path);
}

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function distanceKm(a, b) {
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Names the trip place a photo was taken at, if one is within `maxKm`.
 * Only this name is stored; the photo's own coordinates are not.
 */
export function nearestPlace(places, point, maxKm = 60) {
	let best;
	for (const place of places ?? []) {
		const km = distanceKm(place, point);
		if (km <= maxKm && (!best || km < best.km)) best = { name: place.name, km };
	}
	return best?.name;
}
