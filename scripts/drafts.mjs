// Shared helpers for scripts/new.mjs and scripts/promote.mjs.

export const today = (now = new Date()) => {
	const pad = (n) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const slugify = (text) =>
	text
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60)
		.replace(/-+$/, "");

// Sets `key: value` in the frontmatter, adding the key if it's missing.
export function setFrontmatter(text, key, value) {
	const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) throw new Error("file has no frontmatter");
	const line = new RegExp(`^${key}\\s*:.*$`, "m");
	const body = line.test(match[1])
		? match[1].replace(line, `${key}: ${value}`)
		: `${match[1]}\n${key}: ${value}`;
	return text.replace(match[1], () => body);
}

// Relative files (images) a Markdown file points at: ./x.png, ../y.jpg
export function relativeRefs(text) {
	const refs = new Set();
	for (const m of text.matchAll(/(["'(])(\.{1,2}\/[^"')\s]+)/g)) {
		refs.add(m[2]);
	}
	return [...refs];
}

// Where a draft lands when published. Notes are filed by year and named
// after their date, so both move to the publish date.
export function publishedPath(draftPath, date) {
	const rel = draftPath.replace(/^\.?\/?drafts\//, "");
	if (rel === draftPath) throw new Error(`not in drafts/: ${draftPath}`);
	const [collection, ...rest] = rel.split("/");
	if (collection === "notes" || collection === "links") {
		const name = rest.at(-1).replace(/^\d{4}-\d{2}-\d{2}-/, "");
		return `src/content/${collection}/${date.slice(0, 4)}/${date}-${name}`;
	}
	return `src/content/${rel}`;
}
