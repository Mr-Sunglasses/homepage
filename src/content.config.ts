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

const pages = (base: string) =>
	defineCollection({
		loader: from(base),
		schema: z.strictObject({
			title: z.string(),
			description: z.string().default(""),
			updated: z.coerce.date().optional(),
		}),
	});

export const collections = {
	posts: posts("./src/content/posts"),
	notes: notes("./src/content/notes"),
	links: links("./src/content/links"),
	pages: pages("./src/content/pages"),
	...(DEV
		? {
				postDrafts: posts("./drafts/posts"),
				noteDrafts: notes("./drafts/notes"),
				linkDrafts: links("./drafts/links"),
				pageDrafts: pages("./drafts/pages"),
			}
		: {}),
};
