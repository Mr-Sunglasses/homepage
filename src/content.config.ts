import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Drafts live in /drafts (gitignored) and are only loaded by `astro dev`.
// Production builds never define the draft collections, so nothing in
// /drafts can reach the built site even if the folder exists locally.
const DEV = import.meta.env.DEV;

const from = (base: string) => glob({ pattern: "**/[^_]*.md", base });

// Schemas are strict: an unknown key such as `draft: true` fails the build.
// Whether something is a draft is decided by its folder, never a flag.
const posts = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: ({ image }) =>
			z.strictObject({
				title: z.string(),
				date: z.coerce.date(),
				updated: z.coerce.date().optional(),
				description: z.string().default(""),
				kind: z.enum(["article", "poem", "thought"]).default("article"),
				tags: z.array(z.string()).default([]),
				image: image().optional(),
				fediverse: z.url().optional(),
			}),
	});

const notes = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			date: z.coerce.date(),
			title: z.string().optional(),
			link: z.url().optional(),
			linkTitle: z.string().min(1).optional(),
			tags: z.array(z.string()).default([]),
			fediverse: z.url().optional(),
		}),
	});

const links = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			date: z.coerce.date(),
			url: z.url(),
			title: z.string(),
			via: z.string().optional(),
			tags: z.array(z.string()).default([]),
			fediverse: z.url().optional(),
		}),
	});

// Today I Learned: short, dated, technical. Migrated from tils.kanishkk.xyz.
const tils = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string()).default([]),
			fediverse: z.url().optional(),
		}),
	});

const pages = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			description: z.string().default(""),
			updated: z.coerce.date().optional(),
		}),
	});

const photo = z.strictObject({
	id: z.string().regex(/^[0-9a-f]{12}$/),
	ext: z.string(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	widths: z.array(z.number().int().positive()).min(1),
	sha256: z.string().regex(/^[0-9a-f]{64}$/),
	// Empty while a trip is a draft; the build refuses published photos
	// without it (scripts/check-built.mjs).
	alt: z.string().default(""),
	caption: z.string().optional(),
	takenAt: z.coerce.date().optional(),
	place: z.string().optional(),
	color: z
		.string()
		.regex(/^#[0-9a-f]{6}$/i)
		.optional(),
});

// One folder per trip: trips/<yyyy-mm>-<name>/index.md, story in the body.
const trips = (base: string) =>
	defineCollection({
		loader: glob({ pattern: "*/index.md", base }),
		schema: z.strictObject({
			title: z.string(),
			start: z.coerce.date(),
			end: z.coerce.date().optional(),
			region: z.enum(["india", "world"]),
			summary: z.string().default(""),
			// City-level places for the map; never exact locations.
			places: z
				.array(
					z.strictObject({
						name: z.string().min(1),
						country: z.string().min(1),
						lat: z.number().min(-90).max(90),
						lng: z.number().min(-180).max(180),
					}),
				)
				.default([]),
			cover: z.string().optional(),
			tags: z.array(z.string()).default([]),
			fediverse: z.url().optional(),
			photos: z.array(photo).default([]),
		}),
	});

export const collections = {
	posts: posts("./src/content/posts"),
	notes: notes("./src/content/notes"),
	links: links("./src/content/links"),
	tils: tils("./src/content/tils"),
	pages: pages("./src/content/pages"),
	trips: trips("./src/content/trips"),
	...(DEV
		? {
				postDrafts: posts("./drafts/posts"),
				noteDrafts: notes("./drafts/notes"),
				linkDrafts: links("./drafts/links"),
				tilDrafts: tils("./drafts/tils"),
				pageDrafts: pages("./drafts/pages"),
				tripDrafts: trips("./drafts/trips"),
			}
		: {}),
};
