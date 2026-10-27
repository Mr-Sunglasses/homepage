#!/usr/bin/env node
// Checks the built site in dist/ (run after `pnpm build`):
//   - no page loads JavaScript, except the admin panel
//   - every image has alt text (a trip can't be published with undescribed photos)
//   - the homepage stays small
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const HOMEPAGE_LIMIT = 30 * 1024;

export function checkPage(path, html) {
	const problems = [];
	if (/<script\b/i.test(html)) problems.push(`${path}: loads JavaScript`);
	for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
		const alt = tag.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i);
		if (!alt || (alt[2] ?? alt[3]).trim() === "") {
			const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1] ?? "?";
			problems.push(`${path}: image without alt text (${src})`);
		}
	}
	return problems;
}

function htmlFiles(dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory())
			return name === "admin" ? [] : htmlFiles(path);
		return name.endsWith(".html") ? [path] : [];
	});
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const dist = process.argv[2] ?? "dist";
	const problems = htmlFiles(dist).flatMap((path) =>
		checkPage(relative(dist, path), readFileSync(path, "utf8")),
	);
	const home = statSync(join(dist, "index.html")).size;
	if (home > HOMEPAGE_LIMIT) {
		problems.push(`index.html is ${home} bytes (limit ${HOMEPAGE_LIMIT})`);
	}
	if (problems.length > 0) {
		console.error(`The built site has ${problems.length} problem(s):\n`);
		for (const problem of problems.slice(0, 50)) console.error(`  ${problem}`);
		process.exit(1);
	}
	console.log(
		`Built site OK: no JavaScript, every image has alt text, homepage ${home} bytes.`,
	);
}
