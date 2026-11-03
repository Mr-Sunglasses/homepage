// Share cards: the 1200×630 image shown when a page is shared, for pages
// without a suitable image of their own. src/layouts/Base.astro points
// og:image at cardPath(); src/plugins/og-cards.mjs draws the cards after
// the build. Plain JavaScript, so both (and the tests) can use it.

export const CARD = { width: 1200, height: 630 };

/** Where a page's card is served: /tils/foo/ → /og/tils/foo.jpg. The homepage has none. */
export function cardPath(pathname) {
	const page = pathname
		.replace(/(index)?\.html$/, "")
		.replace(/^\/+|\/+$/g, "");
	return page ? `/og/${page}.jpg` : null;
}

// What kind of page it is, printed above the title. First match wins;
// list pages whose title already says it get no label (see cardLabel).
const LABELS = [
	[/^posts\/poems\/./, "Poem"],
	[/^posts\/thoughts\/./, "Thought"],
	[/^posts\/./, "Article"],
	[/^tils\/(topics|page)\//, "TILs"],
	[/^tils\/./, "TIL"],
	[/^notes\/\d{4}\//, "Notes"],
	[/^notes\/./, "Note"],
	[/^positions\/./, "Position"],
	[/^topics\/./, "Topic"],
	[/^projects\/./, "Project"],
	[/^books\/./, "Book notes"],
	[/^(travel|photos)\/./, "Travel"],
	[/^tags\/./, "Tag"],
	[/^archive\/./, "Archive"],
	[/^writing\/./, "Writing"],
	[/^(links|quotes)\/./, ""],
];

/** The label above a card's title, from the page's path (no leading slash). */
export function cardLabel(path, title = "") {
	const page = path.replace(/^\/+/, "");
	const label = LABELS.find(([pattern]) => pattern.test(page))?.[1] ?? "";
	return label.toLowerCase() === title.trim().toLowerCase() ? "" : label;
}

/**
 * A title as it's drawn on a card: only what the card's font (Inter) can
 * draw, so no emoji and no scripts like Devanagari (they'd show as boxes);
 * spacing tidied. Empty if nothing is left.
 */
export function cardTitle(title) {
	return title
		.replace(
			/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F}|\u{200D}|\u{20E3}/gu,
			"",
		)
		.replace(
			/[^\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Common}\p{Script=Inherited}]/gu,
			"",
		)
		.replace(/\s+([,.!?;:])/g, "$1")
		.replace(/^[\s,.;:–—-]+|[\s,;:–—-]+$/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** The card's alt text: what it says. */
export function cardAlt(title, path, name) {
	const label = cardLabel(path, title);
	return `${label ? `${label}: ` : ""}“${cardTitle(title)}”, by ${name}`;
}

/**
 * Plain text from the start of a Markdown body, for descriptions: no code
 * blocks, headings, images, HTML or link targets; cut at a word, at most
 * `max` characters.
 */
export function excerpt(markdown = "", max = 160) {
	const text = markdown
		.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, " ")
		// Whole lines: headings and ::: callout fences. Line starts: quote and
		// list markers (their text stays).
		.replace(/^\s{0,3}(#{1,6}\s.*|:::.*)$/gm, " ")
		.replace(/^\s{0,3}(>\s?|[-*+]\s+|\d+\.\s+)/gm, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
		.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
		.replace(/\[\[([^\]]+)\]\]/g, "$1")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/`([^`]*)`/g, "$1")
		.replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
		.replace(/\s+/g, " ")
		.trim();
	if (text.length <= max) return text;
	const cut = text.slice(0, max - 1);
	const atWord = cut.slice(0, cut.lastIndexOf(" ")) || cut;
	return `${atWord.replace(/[\s,;:.–—-]+$/, "")}…`;
}
