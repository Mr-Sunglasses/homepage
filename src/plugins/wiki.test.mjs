import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { linkTarget } from "../../scripts/check-built.mjs";
import { buildIndex, outgoing, resolve } from "../lib/wiki.mjs";
import { remarkWikiLinks } from "./remark-wiki-links.mjs";

// A tiny site on disk: a post, a position, a note, a TIL with the same
// slug as the post, and a draft.
function site() {
	const root = mkdtempSync(join(tmpdir(), "wiki-"));
	const write = (path, text) => {
		mkdirSync(join(root, path, ".."), { recursive: true });
		writeFileSync(join(root, path), text);
	};
	write(
		"src/content/posts/liberate-tg.md",
		"---\ntitle: Liberate Telegram\n---\nSee [[software-freedom]].",
	);
	write(
		"src/content/positions/software-freedom.md",
		"---\ntitle: Software freedom\n---\nAlso [[posts/liberate-tg|my proxy post]].",
	);
	write(
		"src/content/notes/2026/2026-10-25-note.md",
		"---\ndate: 2026-10-25\n---\nShort thought about [Telegram](/posts/liberate-tg/).",
	);
	write("src/content/tils/liberate-tg.md", "---\ntitle: A TIL\n---\n");
	write("drafts/positions/secret.md", "---\ntitle: Secret view\n---\n");
	return root;
}

test("index: URLs and titles per collection, drafts only when asked", () => {
	const root = site();
	const index = buildIndex({ root });
	const urls = index.map((e) => e.url).sort();
	assert.deepEqual(urls, [
		"/notes/2026-10-25-note/",
		"/positions/software-freedom/",
		"/posts/liberate-tg/",
		"/tils/liberate-tg/",
	]);
	assert.equal(
		index.find((e) => e.collection === "notes").title,
		"Short thought about Telegram.",
	);
	assert.equal(buildIndex({ root, includeDrafts: true }).length, 5);
});

test("resolve: bare slugs, scoped slugs, ambiguity and missing pages", () => {
	const index = buildIndex({ root: site() });
	assert.equal(
		resolve(index, "software-freedom").entry.url,
		"/positions/software-freedom/",
	);
	assert.equal(
		resolve(index, "tils/liberate-tg").entry.url,
		"/tils/liberate-tg/",
	);
	assert.equal(
		resolve(index, "2026-10-25-note").entry.url,
		"/notes/2026-10-25-note/",
	);
	assert.match(
		resolve(index, "liberate-tg").error,
		/ambiguous: posts\/liberate-tg, tils\/liberate-tg/,
	);
	assert.match(resolve(index, "nope").error, /no page "nope"/);
});

test("outgoing links: wiki links and Markdown links to this site", () => {
	const index = buildIndex({ root: site() });
	const by = (url) => index.find((e) => e.url === url);
	assert.deepEqual(outgoing(index, by("/posts/liberate-tg/")), [
		"/positions/software-freedom/",
	]);
	assert.deepEqual(outgoing(index, by("/positions/software-freedom/")), [
		"/posts/liberate-tg/",
	]);
	assert.deepEqual(outgoing(index, by("/notes/2026-10-25-note/")), [
		"/posts/liberate-tg/",
	]);
});

test("links inside code are not links", () => {
	const index = buildIndex({ root: site() });
	const entry = {
		url: "/x/",
		body: "```sh\n[[ -f ~/.bashrc ]] && echo [[software-freedom]]\n```\nand `[[software-freedom]]` too",
	};
	assert.deepEqual(outgoing(index, entry), []);
});

test("the Markdown plugin turns wiki links into titled links", async () => {
	const root = site();
	const cwd = process.cwd();
	process.chdir(root);
	try {
		const html = String(
			await unified()
				.use(remarkParse)
				.use(remarkWikiLinks, { production: false })
				.use(remarkRehype)
				.use(rehypeStringify)
				.process(
					"Read [[software-freedom]] and [[posts/liberate-tg|this]], not [[missing]].",
				),
		);
		assert.match(
			html,
			/<a href="\/positions\/software-freedom\/" class="wiki">Software freedom<\/a>/,
		);
		assert.match(
			html,
			/<a href="\/posts\/liberate-tg\/" class="wiki">this<\/a>/,
		);
		assert.match(html, /<del class="wiki-missing"[^>]*>missing<\/del>/);

		// A link to a draft is unresolved in a production build (the build
		// then fails in wikiLinkCheck), but the page still renders.
		const prod = String(
			await unified()
				.use(remarkParse)
				.use(remarkWikiLinks, { production: true })
				.use(remarkRehype)
				.use(rehypeStringify)
				.process("Text, then [[secret]]."),
		);
		assert.match(
			prod,
			/<p>Text, then <del class="wiki-missing"[^>]*>secret<\/del>\.<\/p>/,
		);
	} finally {
		process.chdir(cwd);
	}
});

test("built-site link check: pages, files and anchors", () => {
	const files = new Map([
		["index.html", "<p>home</p>"],
		["glossary/index.html", '<dt id="free-software">Free software</dt>'],
		["rss.xml", null],
	]);
	assert.equal(linkTarget("/", files), null);
	assert.equal(linkTarget("/glossary/#free-software", files), null);
	assert.equal(
		linkTarget("/glossary/#open-source", files),
		"missing #open-source",
	);
	assert.equal(linkTarget("/rss.xml", files), null);
	assert.equal(linkTarget("/nowhere/", files), "missing page");
});
