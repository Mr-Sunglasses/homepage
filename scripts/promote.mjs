#!/usr/bin/env node
// Publishes a draft: moves it from drafts/ into src/content/, dates it
// today, and copies the images it uses. Commit and push afterwards.
//   pnpm promote drafts/posts/my-post.md [--keep-date]
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { parseArgs } from "node:util";
import {
	publishedPath,
	relativeRefs,
	setFrontmatter,
	today,
} from "./drafts.mjs";

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: { "keep-date": { type: "boolean", default: false } },
});

try {
	const [draftPath] = positionals;
	if (!draftPath)
		throw new Error("usage: pnpm promote drafts/<collection>/<file>.md");
	const source = relative(process.cwd(), draftPath);
	if (!existsSync(source)) throw new Error(`${source} does not exist`);

	const date = today();
	const isPage = source.startsWith("drafts/pages/");
	let text = readFileSync(source, "utf8");
	const current = text.match(/^date:\s*(\S+)/m)?.[1];
	const publishDate = values["keep-date"] && current ? current : date;

	const dest = publishedPath(source, publishDate);
	if (existsSync(dest)) throw new Error(`${dest} already exists`);

	text = isPage
		? setFrontmatter(text, "updated", date)
		: setFrontmatter(text, "date", publishDate);

	// Copy referenced images next to the published file, at the same relative path.
	const assets = relativeRefs(text).map((ref) => ({
		from: join(dirname(source), ref),
		to: join(dirname(dest), ref),
	}));
	for (const { from, to } of assets) {
		if (!existsSync(from))
			throw new Error(`${source} uses ${from}, which is missing`);
		if (existsSync(to) && !readFileSync(to).equals(readFileSync(from))) {
			throw new Error(`${to} already exists with different content`);
		}
	}

	for (const { from, to } of assets) {
		mkdirSync(dirname(to), { recursive: true });
		copyFileSync(from, to);
	}
	mkdirSync(dirname(dest), { recursive: true });
	writeFileSync(dest, text);
	rmSync(source);

	console.log(`Published ${dest}`);
	for (const { to } of assets) console.log(`  with ${to}`);
	console.log("\nReview, then commit:");
	console.log(`  git add ${[dest, ...assets.map((a) => a.to)].join(" ")}`);
} catch (error) {
	console.error(error.message);
	process.exit(1);
}
