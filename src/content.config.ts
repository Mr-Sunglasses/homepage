import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Drafts live in /drafts (gitignored) and are only loaded by `astro dev`.
// Production builds never define the draft collections, so nothing in
// /drafts can reach the built site even if the folder exists locally.
const DEV = import.meta.env.DEV;

const from = (base: string) => glob({ pattern: "**/[^_]*.md", base });

// How sure I am about a piece of writing, shown next to it.
const confidence = z.enum(["idea", "developing", "settled"]).optional();

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
				confidence,
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
			confidence,
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

// What I believe, kept current. The body holds the reasoning and sources.
const positions = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			summary: z.string().min(1),
			confidence: z.enum(["idea", "developing", "settled"]),
			updated: z.coerce.date(),
			reviewed: z.coerce.date().optional(),
			changeMind: z.string().optional(),
			tags: z.array(z.string()).default([]),
			// Dated changes of view, newest first.
			history: z
				.array(
					z.strictObject({ date: z.coerce.date(), change: z.string().min(1) }),
				)
				.default([]),
			fediverse: z.url().optional(),
		}),
	});

// A front door to a theme: an intro, then everything with its tags.
const topics = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			summary: z.string().min(1),
			tags: z.array(z.string()).min(1),
			position: z.string().optional(),
			order: z.number().default(100),
		}),
	});

const projects = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			summary: z.string().min(1),
			role: z.string().optional(),
			status: z.enum(["active", "maintained", "past"]),
			start: z.coerce.date(),
			end: z.coerce.date().optional(),
			url: z.url().optional(),
			repo: z.url().optional(),
			tags: z.array(z.string()).default([]),
		}),
	});

const talks = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			event: z.string(),
			date: z.coerce.date(),
			place: z.string().optional(),
			url: z.url().optional(),
			slides: z.url().optional(),
			video: z.url().optional(),
			tags: z.array(z.string()).default([]),
		}),
	});

const books = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			author: z.string(),
			status: z.enum(["reading", "read", "want", "abandoned"]),
			started: z.coerce.date().optional(),
			finished: z.coerce.date().optional(),
			rating: z.number().int().min(1).max(5).optional(),
			url: z.url().optional(),
			tags: z.array(z.string()).default([]),
		}),
	});

// The quote itself is the body.
const quotes = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			author: z.string(),
			source: z.string().optional(),
			url: z.url().optional(),
			date: z.coerce.date(),
			tags: z.array(z.string()).default([]),
		}),
	});

// Things I avoid, and what I use instead. The body says why.
const avoid = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			name: z.string(),
			instead: z.string(),
			category: z.string(),
			url: z.url().optional(),
			since: z.coerce.date().optional(),
		}),
	});

// Terms I use deliberately. The body is the definition.
const glossary = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			term: z.string(),
			seeAlso: z.array(z.string()).default([]),
			tags: z.array(z.string()).default([]),
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
	positions: positions("./src/content/positions"),
	topics: topics("./src/content/topics"),
	projects: projects("./src/content/projects"),
	talks: talks("./src/content/talks"),
	books: books("./src/content/books"),
	quotes: quotes("./src/content/quotes"),
	avoid: avoid("./src/content/avoid"),
	glossary: glossary("./src/content/glossary"),
	...(DEV
		? {
				postDrafts: posts("./drafts/posts"),
				noteDrafts: notes("./drafts/notes"),
				linkDrafts: links("./drafts/links"),
				tilDrafts: tils("./drafts/tils"),
				pageDrafts: pages("./drafts/pages"),
				tripDrafts: trips("./drafts/trips"),
				positionDrafts: positions("./drafts/positions"),
				topicDrafts: topics("./drafts/topics"),
				projectDrafts: projects("./drafts/projects"),
				talkDrafts: talks("./drafts/talks"),
				bookDrafts: books("./drafts/books"),
				quoteDrafts: quotes("./drafts/quotes"),
				avoidDrafts: avoid("./drafts/avoid"),
				glossaryDrafts: glossary("./drafts/glossary"),
			}
		: {}),
};
