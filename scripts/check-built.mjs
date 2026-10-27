#!/usr/bin/env node
// Checks the built site in dist/ (run after `pnpm build`):
//   - no page loads JavaScript, except search and the admin panel
//   - every image has alt text (a trip can't be published with undescribed photos)
//   - every link to this site points at a page (and anchor) that exists
//   - the homepage stays small
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const HOMEPAGE_LIMIT = 30 * 1024;
// Pages allowed to load JavaScript.
const SCRIPTED = new Set(["search/index.html"]);

export function checkPage(path, html, { scripted = false } = {}) {
	const problems = [];
	if (!scripted && /<script\b/i.test(html))
		problems.push(`${path}: loads JavaScript`);
	for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
		const alt = tag.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i);
		if (!alt || (alt[2] ?? alt[3]).trim() === "") {
			const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1] ?? "?";
			problems.push(`${path}: image without alt text (${src})`);
		}
	}
	return problems;
}

/** Internal links on a page: root-relative hrefs, without the query. */
export function internalLinks(html) {
	return [...html.matchAll(/\bhref="(\/[^"?]*)(?:\?[^"]*)?"/g)]
		.map(([, href]) => href)
		.filter((href) => !href.startsWith("//"));
}

/** Does `href` exist in the built site `files` (path → html)? */
export function linkTarget(href, files) {
	const [path, anchor] = href.split("#");
	const decoded = decodeURIComponent(path);
	const candidates = decoded.endsWith("/")
		? [`${decoded.slice(1)}index.html`]
		: [decoded.slice(1), `${decoded.slice(1)}/index.html`];
	const file = candidates.find((c) => files.has(c));
	if (!file) return "missing page";
	if (anchor && files.get(file) !== null) {
		const html = files.get(file);
		if (
			!new RegExp(
				`\\bid="${anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
			).test(html)
		) {
			return `missing #${anchor}`;
		}
	}
	return null;
}

function allFiles(dir, root = dir) {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory()
			? allFiles(path, root)
			: [relative(root, path)];
	});
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const dist = process.argv[2] ?? "dist";
	if (!existsSync(join(dist, "index.html"))) {
		console.error(`No built site in ${dist}/. Run pnpm build first.`);
		process.exit(1);
	}
	// Every file in the build; HTML pages keep their text for anchor checks.
	const files = new Map(
		allFiles(dist).map((path) => [
			path.split("\\").join("/"),
			path.endsWith(".html") ? readFileSync(join(dist, path), "utf8") : null,
		]),
	);
	const pages = [...files.entries()].filter(
		([path, html]) => html !== null && !path.startsWith("admin/"),
	);
	const problems = [];
	for (const [path, html] of pages) {
		problems.push(...checkPage(path, html, { scripted: SCRIPTED.has(path) }));
		for (const href of new Set(internalLinks(html))) {
			const missing = linkTarget(href, files);
			if (missing) problems.push(`${path}: broken link ${href} (${missing})`);
		}
	}
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
		`Built site OK: ${pages.length} pages, no JavaScript outside search, every image has alt text, every internal link resolves, homepage ${home} bytes.`,
	);
}
