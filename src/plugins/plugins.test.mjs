import assert from "node:assert/strict";
import { test } from "node:test";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describe, rehypeEmbedsToLinks } from "./rehype-embeds-to-links.mjs";
import { COLUMN_SIZES, rehypeImageHints } from "./rehype-image-hints.mjs";
import { rehypeLangHindi } from "./rehype-lang-hindi.mjs";
import { remarkDropTitleHeading } from "./remark-drop-title-heading.mjs";
import { remarkPlainDirectives } from "./remark-plain-directives.mjs";

const toHtml = async (markdown) =>
	String(
		await unified()
			.use(remarkParse)
			.use(remarkDirective)
			.use(remarkPlainDirectives)
			.use(remarkRehype, { allowDangerousHtml: true })
			.use(rehypeEmbedsToLinks)
			.use(rehypeStringify, { allowDangerousHtml: true })
			.process(markdown),
	);

test("callouts become asides with a title", async () => {
	const html = await toHtml(":::tip\nUse a VPS.\n:::");
	assert.match(html, /<aside class="callout callout-tip">/);
	assert.match(html, /<p class="callout-title">Tip<\/p>/);
	assert.match(html, /<p>Use a VPS\.<\/p>/);
});

test("a callout label replaces the default title", async () => {
	const html = await toHtml(":::note[About the Author]\nFrost.\n:::");
	assert.match(html, /<p class="callout-title">About the Author<\/p>/);
	assert.doesNotMatch(html, />Note</);
});

test("::github becomes a plain link", async () => {
	const html = await toHtml('::github{repo="SoliSpirit/mtproto"}');
	assert.match(
		html,
		/<a href="https:\/\/github\.com\/SoliSpirit\/mtproto">github\.com\/SoliSpirit\/mtproto<\/a>/,
	);
});

test("colons in prose are kept as written", async () => {
	const html = await toHtml("Open localhost:port and see:this[now]{x=1}.");
	assert.match(html, /localhost:port and see:this\[now\]\{x="1"\}\./);
});

test("unknown container directives keep their content", async () => {
	const html = await toHtml(":::details\nHidden text\n:::");
	assert.match(html, /<p>Hidden text<\/p>/);
});

test("YouTube iframes in raw HTML become links", async () => {
	const html = await toHtml(
		'<iframe width="560" src="https://www.youtube.com/embed/m5t08CREHcE?si=x" title="YouTube video player"></iframe>',
	);
	assert.doesNotMatch(html, /<iframe/);
	assert.match(
		html,
		/<a href="https:\/\/www\.youtube\.com\/watch\?v=m5t08CREHcE">▶ Video on YouTube<\/a>/,
	);
});

test("a wrapper div around an iframe goes too", async () => {
	const html = await toHtml(
		'<div style="padding-bottom:72%"><iframe src="https://giphy.com/embed/l3q2XhfQ8oCkm1Ts4"></iframe></div>',
	);
	assert.doesNotMatch(html, /<div|<iframe/);
	assert.match(html, /giphy\.com\/gifs\/l3q2XhfQ8oCkm1Ts4/);
});

test("meaningful iframe titles are kept", () => {
	const { text } = describe(
		"https://www.youtube.com/embed/abcdefg",
		"How cron works",
	);
	assert.equal(text, "▶ Video on YouTube: How cron works");
});

const withTitle = async (markdown, title) => {
	const file = { value: markdown, data: { astro: { frontmatter: { title } } } };
	return String(
		await unified()
			.use(remarkParse)
			.use(remarkDropTitleHeading)
			.use(remarkRehype)
			.use(rehypeStringify)
			.process(file),
	);
};

test("a first heading that repeats the title is dropped", async () => {
	const html = await withTitle(
		"# She Was My Color\n\nRose.",
		"She was my color!",
	);
	assert.equal(html, "<p>Rose.</p>");
});

test("a different first heading is kept", async () => {
	const html = await withTitle("## Setup\n\nText.", "Mastering Cron");
	assert.match(html, /<h2>Setup<\/h2>/);
});

test("a repeated title later in the post is kept", async () => {
	const html = await withTitle("Intro.\n\n# Mastering Cron", "Mastering Cron");
	assert.match(html, /<h1>Mastering Cron<\/h1>/);
});

const withRehype = async (markdown, plugin) =>
	String(
		await unified()
			.use(remarkParse)
			.use(remarkRehype)
			.use(plugin)
			.use(rehypeStringify)
			.process(markdown),
	);

test("an image at the top loads first; later ones stay lazy", async () => {
	const html = await withRehype(
		"![cover](a.jpg)\n\ntext\n\n![later](b.jpg)",
		rehypeImageHints,
	);
	assert.match(
		html,
		/alt="cover" sizes="[^"]+" loading="eager" fetchpriority="high"/,
	);
	assert.doesNotMatch(html, /alt="later"[^>]*eager/);
	assert.equal(html.split(`sizes="${COLUMN_SIZES}"`).length - 1, 2);
});

test("an image further down doesn't load early", async () => {
	const html = await withRehype(
		"one\n\ntwo\n\nthree\n\n![late](a.jpg)",
		rehypeImageHints,
	);
	assert.doesNotMatch(html, /eager/);
});

test("Devanagari is marked as Hindi, code is left alone", async () => {
	const html = await withRehype(
		"He said गुनाहों का देवता, a classic. `नमस्ते`",
		rehypeLangHindi,
	);
	assert.equal(
		html,
		'<p>He said <span lang="hi">गुनाहों का देवता</span>, a classic. <code>नमस्ते</code></p>',
	);
});
