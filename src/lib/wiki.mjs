// An index of every page-like entry, read straight from the content folders.
// Used by the [[wiki link]] Markdown plugin (which runs before Astro's
// collections exist) and by the "Mentioned in" backlinks, so both resolve
// links the same way.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const last = (id) => id.split("/").pop();

// Collection → how its entries are addressed on the site.
export const ROUTES = {
	posts: (id) => `/posts/${id}/`,
	notes: (id) => `/notes/${last(id)}/`,
	links: (id) => `/links/#${last(id)}`,
	tils: (id) => `/tils/${id}/`,
	trips: (id) => `/travel/${id.replace(/\/index$/, "")}/`,
	pages: (id) => `/${id}/`,
	positions: (id) => `/positions/${id}/`,
	topics: (id) => `/topics/${id}/`,
	projects: (id) => `/projects/${id}/`,
	talks: (id) => `/talks/#${id}`,
	books: (id) => `/books/${id}/`,
	quotes: (id) => `/quotes/#${id}`,
	avoid: (id) => `/avoid/#${id}`,
	glossary: (id) => `/glossary/#${id}`,
};

function markdownFiles(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return markdownFiles(path);
		return name.endsWith(".md") && !name.startsWith("_") ? [path] : [];
	});
}

function parse(text) {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { data: {}, body: text };
	const field = (key) =>
		match[1]
			.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]
			?.trim()
			.replace(/^(["'])(.*)\1$/, "$2");
	return {
		data: {
			title: field("title"),
			term: field("term"),
			name: field("name"),
			author: field("author"),
			linkTitle: field("linkTitle"),
		},
		body: match[2],
	};
}

function firstWords(body, max = 60) {
	const text = body
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(
			/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
			(_, target, label) => label ?? target,
		)
		.replace(/[#>*_`]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Every entry as { collection, id, url, title, body, isDraft }.
 * `root` is the project folder; drafts are included only when asked.
 */
export function buildIndex({
	root = process.cwd(),
	includeDrafts = false,
} = {}) {
	const bases = [
		["src/content", false],
		...(includeDrafts ? [["drafts", true]] : []),
	];
	const entries = [];
	for (const [base, isDraft] of bases) {
		for (const collection of Object.keys(ROUTES)) {
			const dir = join(root, base, collection);
			for (const file of markdownFiles(dir)) {
				const id = relative(dir, file)
					.replace(/\.md$/, "")
					.split("\\")
					.join("/");
				if (collection === "trips" && !id.endsWith("/index")) continue;
				const { data, body } = parse(readFileSync(file, "utf8"));
				entries.push({
					collection,
					id,
					url: ROUTES[collection](id),
					title:
						data.title ||
						data.term ||
						data.name ||
						data.linkTitle ||
						(collection === "quotes"
							? `Quote by ${data.author}`
							: firstWords(body)),
					body,
					isDraft,
				});
			}
		}
	}
	return entries;
}

/** Looks up a wiki link target: "slug", "collection/slug", or a note's file name. */
export function resolve(index, target) {
	const key = target.trim().replace(/\/$/, "");
	const [maybeCollection, ...rest] = key.split("/");
	const scoped = maybeCollection in ROUTES && rest.length > 0;
	const matches = index.filter((entry) => {
		if (scoped && entry.collection !== maybeCollection) return false;
		const wanted = scoped ? rest.join("/") : key;
		return (
			entry.id === wanted ||
			last(entry.id) === wanted ||
			entry.id === `${wanted}/index`
		);
	});
	if (matches.length === 1) return { entry: matches[0] };
	if (matches.length === 0) return { error: `no page "${target}"` };
	return {
		error: `"${target}" is ambiguous: ${matches.map((m) => `${m.collection}/${m.id}`).join(", ")}`,
	};
}

export const WIKI_LINK = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;

/** Markdown without code blocks and inline code, where [[…]] isn't a link. */
export const withoutCode = (body) =>
	body.replace(/^(```|~~~)[\s\S]*?^\1/gm, "").replace(/`[^`\n]*`/g, "");

/** URLs an entry links to: [[wiki links]] and Markdown links to this site. */
export function outgoing(index, entry, site = "https://kanishkk.xyz") {
	const urls = new Set();
	const body = withoutCode(entry.body);
	for (const [, target] of body.matchAll(WIKI_LINK)) {
		const { entry: found } = resolve(index, target);
		if (found) urls.add(found.url);
	}
	const sitePattern = site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const markdownLink = new RegExp(
		`\\]\\((?:${sitePattern})?(/[^)\\s#?]*)`,
		"g",
	);
	for (const [, path] of body.matchAll(markdownLink)) {
		const normal = path.endsWith("/") ? path : `${path}/`;
		if (index.some((e) => e.url === normal)) urls.add(normal);
	}
	urls.delete(entry.url);
	return [...urls];
}
