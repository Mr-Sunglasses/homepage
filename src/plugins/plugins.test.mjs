import assert from "node:assert/strict";
import { test } from "node:test";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { describe, rehypeEmbedsToLinks } from "./rehype-embeds-to-links.mjs";
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
