#!/usr/bin/env node
// Starts a new draft in drafts/ (never committed).
//   pnpm new post "Title" [--kind article|poem|thought]
//   pnpm new note ["Title"] [--link https://…]
//   pnpm new link https://… "Title"
//   pnpm new page now|uses|…
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { slugify, today } from "./drafts.mjs";

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: { kind: { type: "string" }, link: { type: "string" } },
});
const [type, ...args] = positionals;
const date = today();
const yaml = (text) => JSON.stringify(text);

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
		case "page": {
			const [name] = args;
			if (!name) throw new Error("usage: pnpm new page <name>");
			const title = name.charAt(0).toUpperCase() + name.slice(1);
			return [
				`drafts/pages/${slugify(name)}.md`,
				`---\ntitle: ${yaml(title)}\ndescription: ""\nupdated: ${date}\n---\n\n`,
			];
		}
		default:
			throw new Error("usage: pnpm new post|note|link|page …");
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
