import type { Photo, Trip } from "@/lib/content";
import { tripSlug } from "@/lib/content";
import { variantKey } from "@/lib/photo-keys.mjs";

// Photos are served by the photo store, not from this site. Locally,
// scripts/dev-stores.sh points this at a local Garage store.
const BASE = (
	import.meta.env.PUBLIC_PHOTOS_URL || "https://photos.kanishkk.xyz"
).replace(/\/$/, "");

export type Format = "avif" | "webp";

// The photo stream is split into pages of this many photos.
export const PHOTOS_PER_PAGE = 48;

export const photoFile = (
	trip: Trip,
	photo: Photo,
	width: number,
	format: Format,
) => `${BASE}/${variantKey(tripSlug(trip), photo.id, width, format)}`;

export const srcset = (trip: Trip, photo: Photo, format: Format) =>
	photo.widths
		.map((width) => `${photoFile(trip, photo, width, format)} ${width}w`)
		.join(", ");

export const largestWidth = (photo: Photo) => Math.max(...photo.widths);

/** The largest size at or under `max`, for <img src> and social previews. */
export const widthUpTo = (photo: Photo, max: number) =>
	Math.max(...photo.widths.filter((w) => w <= max), Math.min(...photo.widths));

/** All photos on all trips, newest first, each with its trip. */
export function allPhotos(trips: Trip[]) {
	return trips
		.flatMap((trip) => trip.data.photos.map((photo) => ({ trip, photo })))
		.sort(
			(a, b) =>
				(b.photo.takenAt ?? b.trip.data.start).valueOf() -
				(a.photo.takenAt ?? a.trip.data.start).valueOf(),
		);
}
