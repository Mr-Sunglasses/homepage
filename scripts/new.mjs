#!/usr/bin/env node
// Starts a new draft in drafts/ (never committed).
//   pnpm new post "Title" [--kind article|poem|thought]
//   pnpm new note ["Title"] [--link https://…]
//   pnpm new link https://… "Title"
//   pnpm new til "Title" [--tags git,bash]
//   pnpm new position "Software freedom"
//   pnpm new topic "Self-hosting" --tags selfhosting,homelab
//   pnpm new project "bitssh" [--repo https://…]
//   pnpm new talk "Title" --event "PyCon India" --start 2026-11-20
//   pnpm new book "Animal Farm" --author "George Orwell" [--status reading|read|want]
//   pnpm new quote "Author"
//   pnpm new avoid "WhatsApp" --instead "Signal" --category Messaging
//   pnpm new term "Free software"
//   pnpm new page now|uses|…
//   pnpm new trip "Ladakh" --start 2026-10-02 [--end 2026-10-12] --region india|world
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { slugify, today } from "./drafts.mjs";

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		kind: { type: "string" },
		link: { type: "string" },
		start: { type: "string" },
		end: { type: "string" },
		region: { type: "string" },
		tags: { type: "string" },
		repo: { type: "string" },
		event: { type: "string" },
		author: { type: "string" },
		status: { type: "string" },
		instead: { type: "string" },
		category: { type: "string" },
	},
});
const [type, ...args] = positionals;
const date = today();
const yaml = (text) => JSON.stringify(text);
const list = (text) =>
	(text ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

function draft() {
	switch (type) {
		case "post": {
			const [title] = args;
			if (!title) throw new Error('usage: pnpm new post "Title"');
			const kind = values.kind ?? "article";
			const folder = kind === "poem" ? "posts/poems" : "posts";
			return [
				`drafts/${folder}/${slugify(title)}.md`,
				`---\ntitle: ${yaml(title)}\ndate: ${date}\ndescription: ""\nkind: ${kind}\ntags: []\n---\n\n`,
			];
		}
		case "note": {
			const [title] = args;
			const link = values.link;
			const name = slugify(title ?? (link ? new URL(link).hostname : "note"));
			const lines = [`date: ${date}`];
			if (title) lines.push(`title: ${yaml(title)}`);
			if (link) lines.push(`link: ${link}`);
			lines.push("tags: []");
			return [
				`drafts/notes/${date.slice(0, 4)}/${date}-${name}.md`,
				`---\n${lines.join("\n")}\n---\n\n`,
			];
		}
		case "link": {
			const [url, title] = args;
			if (!url || !title)
				throw new Error('usage: pnpm new link https://… "Title"');
			return [
				`drafts/links/${date.slice(0, 4)}/${date}-${slugify(title)}.md`,
				`---\ndate: ${date}\nurl: ${url}\ntitle: ${yaml(title)}\ntags: []\n---\n\nWhy it's worth reading.\n`,
			];
		}
		case "til": {
			const [title] = args;
			if (!title)
				throw new Error('usage: pnpm new til "Title" [--tags git,bash]');
			const tags = list(values.tags);
			return [
				`drafts/tils/${slugify(title)}.md`,
				`---\ntitle: ${yaml(title)}\ndate: ${date}\ntags: [${tags.join(", ")}]\n---\n\n`,
			];
		}
		case "position": {
			const [title] = args;
			if (!title) throw new Error('usage: pnpm new position "Title"');
			return [
				`drafts/positions/${slugify(title)}.md`,
				`---\ntitle: ${yaml(title)}\nsummary: "My view, in a sentence or two."\nconfidence: developing\nupdated: ${date}\nreviewed: ${date}\nchangeMind: ""\ntags: []\nhistory: []\n---\n\nWhy I think this, with sources.\n`,
			];
		}
		case "topic": {
			const [title] = args;
			const tags = list(values.tags);
			if (!title || tags.length === 0) {
				throw new Error('usage: pnpm new topic "Title" --tags tag1,tag2');
			}
			return [
				`drafts/topics/${slugify(title)}.md`,
				`---\ntitle: ${yaml(title)}\nsummary: "One line: what this topic is about."\ntags: [${tags.join(", ")}]\n---\n\nStart here: a short introduction, and the three things to read first.\n`,
			];
		}
		case "project": {
			const [title] = args;
			if (!title)
				throw new Error('usage: pnpm new project "Name" [--repo https://…]');
			const repo = values.repo ? `repo: ${values.repo}\n` : "";
			return [
				`drafts/projects/${slugify(title)}.md`,
				`---\ntitle: ${yaml(title)}\nsummary: "What it is, in a sentence."\nstatus: active\nstart: ${date}\n${repo}tags: []\n---\n\nWhy I built it, and what I learned.\n`,
			];
		}
		case "talk": {
			const [title] = args;
			const { event, start } = values;
			if (!title || !event) {
				throw new Error(
					'usage: pnpm new talk "Title" --event "Event" [--start YYYY-MM-DD]',
				);
			}
			const when = start ?? date;
			return [
				`drafts/talks/${when.slice(0, 4)}-${slugify(title)}.md`,
				`---\ntitle: ${yaml(title)}\nevent: ${yaml(event)}\ndate: ${when}\ntags: []\n---\n\nWhat the talk was about.\n`,
			];
		}
		case "book": {
			const [title] = args;
			const { author } = values;
			const status = values.status ?? "reading";
			if (!title || !author) {
				throw new Error(
					'usage: pnpm new book "Title" --author "Name" [--status reading|read|want]',
				);
			}
			const started = status === "want" ? "" : `started: ${date}\n`;
			return [
				`drafts/books/${slugify(title)}.md`,
				`---\ntitle: ${yaml(title)}\nauthor: ${yaml(author)}\nstatus: ${status}\n${started}tags: []\n---\n\n`,
			];
		}
		case "quote": {
			const [author] = args;
			if (!author) throw new Error('usage: pnpm new quote "Author"');
			return [
				`drafts/quotes/${slugify(author)}-${date.replaceAll("-", "")}.md`,
				`---\nauthor: ${yaml(author)}\nsource: ""\ndate: ${date}\ntags: []\n---\n\nThe quote.\n`,
			];
		}
		case "avoid": {
			const [name] = args;
			const { instead, category } = values;
			if (!name || !instead || !category) {
				throw new Error(
					'usage: pnpm new avoid "Name" --instead "Alternative" --category "Category"',
				);
			}
			return [
				`drafts/avoid/${slugify(name)}.md`,
				`---\nname: ${yaml(name)}\ninstead: ${yaml(instead)}\ncategory: ${yaml(category)}\nsince: ${date}\n---\n\nWhy.\n`,
			];
		}
		case "term": {
			const [term] = args;
			if (!term) throw new Error('usage: pnpm new term "Term"');
			return [
				`drafts/glossary/${slugify(term)}.md`,
				`---\nterm: ${yaml(term)}\nseeAlso: []\ntags: []\n---\n\nWhat I mean by it.\n`,
			];
		}
		case "page": {
			const [name] = args;
			if (!name) throw new Error("usage: pnpm new page <name>");
			const title = name.charAt(0).toUpperCase() + name.slice(1);
			return [
				`drafts/pages/${slugify(name)}.md`,
				`---\ntitle: ${yaml(title)}\ndescription: ""\nupdated: ${date}\n---\n\n`,
			];
		}
		case "trip": {
			const [title] = args;
			const { start, end, region } = values;
			if (
				!title ||
				!/^\d{4}-\d{2}-\d{2}$/.test(start ?? "") ||
				!["india", "world"].includes(region)
			) {
				throw new Error(
					'usage: pnpm new trip "Title" --start YYYY-MM-DD [--end YYYY-MM-DD] --region india|world',
				);
			}
			const lines = [
				`title: ${yaml(title)}`,
				`start: ${start}`,
				...(end ? [`end: ${end}`] : []),
				`region: ${region}`,
				'summary: ""',
				"# City-level only, for the map. Example:",
				"#   - { name: McLeod Ganj, country: India, lat: 32.24, lng: 76.32 }",
				"places: []",
				"tags: []",
				"photos: []",
			];
			return [
				`drafts/trips/${start.slice(0, 7)}-${slugify(title)}/index.md`,
				`---\n${lines.join("\n")}\n---\n\nThe story of the trip.\n`,
			];
		}
		default:
			throw new Error(
				"usage: pnpm new post|note|link|til|page|trip|position|topic|project|talk|book|quote|avoid|term …",
			);
	}
}

try {
	const [path, text] = draft();
	if (existsSync(path)) throw new Error(`${path} already exists`);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, text);
	console.log(`Created ${path}`);
	console.log("Preview it with `pnpm dev`; drafts are listed at /drafts/.");
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
