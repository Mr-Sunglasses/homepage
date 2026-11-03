#!/usr/bin/env node
// Checks the built site in dist/ (run after `pnpm build`):
//   - no page loads JavaScript, except search and the admin panel
//   - no page loads anything from another site (images, styles, scripts,
//     media), which would tell that site who's reading; travel photos come
//     from the photo host
//   - every image has alt text (a trip can't be published with undescribed photos)
//   - every link to this site points at a page (and anchor) that exists
//   - the homepage stays small
//   - every page has a share image that exists, with alt text, and any
//     structured data (JSON-LD) parses
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const HOMEPAGE_LIMIT = 30 * 1024;
const PHOTO_HOST = new URL(
	process.env.PUBLIC_PHOTOS_URL ?? "https://photos.kanishkk.xyz",
).host;
// Pages allowed to load JavaScript.
const SCRIPTED = new Set(["search/index.html"]);

/** URLs a page loads by itself (not links the reader follows). */
export function loadedUrls(html) {
	const tags =
		/<(img|source|video|audio|track|script|iframe|embed|object|link)\b[^>]*>/gi;
	return [...html.matchAll(tags)]
		.filter(
			([tag, name]) =>
				name.toLowerCase() !== "link" ||
				/\brel="(?:stylesheet|preload|modulepreload|icon|apple-touch-icon)"/i.test(
					tag,
				),
		)
		.flatMap(([tag]) =>
			[
				...tag.matchAll(/\b(?:src|href|srcset|poster|data)="([^"]*)"/gi),
			].flatMap(([, value]) =>
				value.split(",").map((part) => part.trim().split(/\s+/)[0]),
			),
		);
}

export function checkPage(
	path,
	html,
	{ scripted = false, photoHost = PHOTO_HOST } = {},
) {
	const problems = [];
	// JSON-LD is data for search engines, not JavaScript: browsers don't run it.
	const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(
		([, attrs]) => !/\btype="application\/ld\+json"/i.test(attrs),
	);
	if (!scripted && scripts.length > 0)
		problems.push(`${path}: loads JavaScript`);
	for (const url of new Set(loadedUrls(html))) {
		if (!/^(https?:)?\/\//i.test(url)) continue;
		const host = new URL(url, "https://kanishkk.xyz").host;
		if (host !== "kanishkk.xyz" && host !== photoHost)
			problems.push(`${path}: loads ${url} from another site`);
	}
	for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
		const alt = tag.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i);
		if (!alt || (alt[2] ?? alt[3]).trim() === "") {
			const src = tag.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1] ?? "?";
			problems.push(`${path}: image without alt text (${src})`);
		}
	}
	return problems;
}

/**
 * Share-image and structured-data problems on a page. `files` is the built
 * site (path → html or null), to check that the image exists.
 */
export function shareProblems(
	path,
	html,
	files,
	site = "https://kanishkk.xyz",
) {
	const problems = [];
	const meta = (key) =>
		html.match(
			new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`),
		)?.[1];
	const image = meta("og:image");
	if (!image) problems.push(`${path}: no og:image`);
	else if (image.startsWith(`${site}/`)) {
		const file = decodeURIComponent(new URL(image).pathname.slice(1));
		if (!files.has(file))
			problems.push(`${path}: og:image ${image} doesn't exist`);
	}
	if (!meta("og:image:alt")?.trim())
		problems.push(`${path}: og:image has no alt text`);
	for (const [, json] of html.matchAll(
		/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
	)) {
		try {
			JSON.parse(json);
		} catch {
			problems.push(`${path}: structured data isn't valid JSON`);
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
		if (!path.startsWith("drafts/"))
			problems.push(...shareProblems(path, html, files));
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
		`Built site OK: ${pages.length} pages, no JavaScript outside search, nothing loaded from other sites, every image has alt text, every internal link resolves, every page has a share image, homepage ${home} bytes.`,
	);
}
