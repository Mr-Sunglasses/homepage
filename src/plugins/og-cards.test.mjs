import assert from "node:assert/strict";
import { test } from "node:test";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import {
	cardAlt,
	cardLabel,
	cardPath,
	cardTitle,
	excerpt,
} from "../lib/og.mjs";
import { fitTitle, measure, metaValues, renderCard } from "./og-cards.mjs";

test("card paths follow page paths; the homepage has none", () => {
	assert.equal(cardPath("/tils/less-is-more/"), "/og/tils/less-is-more.jpg");
	assert.equal(
		cardPath("/posts/poems/a-minor-bird/"),
		"/og/posts/poems/a-minor-bird.jpg",
	);
	assert.equal(cardPath("/404"), "/og/404.jpg");
	assert.equal(cardPath("/404.html"), "/og/404.jpg");
	assert.equal(cardPath("/"), null);
});

test("labels say what kind of page it is, unless the title already does", () => {
	assert.equal(cardLabel("tils/less-is-more/"), "TIL");
	assert.equal(cardLabel("tils/topics/git/"), "TILs");
	assert.equal(cardLabel("posts/poems/a-minor-bird/"), "Poem");
	assert.equal(cardLabel("/posts/hello-ghostty/"), "Article");
	assert.equal(cardLabel("books/kafan/"), "Book notes");
	assert.equal(cardLabel("tags/git/"), "Tag");
	assert.equal(cardLabel("tils/", "TILs"), "");
	assert.equal(cardLabel("about/", "About"), "");
});

test("card titles drop what the font can't draw", () => {
	assert.equal(cardTitle("🌍✨ The Coldplay 💚🌿 🕊️❤️ 🌈⚖️ 💫🌎"), "The Coldplay");
	assert.equal(
		cardTitle("Liberate Telegram ⛓️‍💥, Selfhost your own MTProto proxy!"),
		"Liberate Telegram, Selfhost your own MTProto proxy!",
	);
	assert.equal(cardTitle("Café naïve"), "Café naïve");
	assert.equal(cardTitle("गुनाहों का देवता"), "");
	assert.equal(cardTitle("Notes on गुनाहों का देवता"), "Notes on");
});

test("card alt text says what the card shows", () => {
	assert.equal(
		cardAlt("less is more", "/tils/less-is-more/", "Kanishk Pachauri"),
		"TIL: “less is more”, by Kanishk Pachauri",
	);
	assert.equal(cardAlt("About", "/about/", "K"), "“About”, by K");
});

test("excerpts are plain text from the start of the body", () => {
	const body = [
		"## Heading",
		"",
		"So I was watching a video about **bash** by [YSAP](https://example.com) and `less` came up.",
		"",
		"```sh",
		"less file.txt",
		"```",
		"",
		"- a list item with ![an image](x.png) and [[glossary/til|a wiki link]]",
	].join("\n");
	assert.equal(
		excerpt(body),
		"So I was watching a video about bash by YSAP and less came up. a list item with and a wiki link",
	);
	const long = excerpt("word ".repeat(100), 30);
	assert.ok(long.length <= 30 && long.endsWith("…"), long);
	assert.equal(excerpt(""), "");
});

test("titles wrap, shrink to fit, and are shortened only when they must be", () => {
	const short = fitTitle("less is more", 1040);
	assert.deepEqual(short, { lines: ["less is more"], size: 68 });
	const long = fitTitle(
		"How to give your agent a headless browser on Raspberry PI 5?",
		1040,
	);
	assert.ok(
		long.lines.length >= 2 && long.lines.length * long.size * 1.15 <= 300,
	);
	assert.equal(
		long.lines.join(" "),
		"How to give your agent a headless browser on Raspberry PI 5?",
	);
	const huge = fitTitle("word ".repeat(80).trim(), 600);
	assert.ok(huge.lines.at(-1).endsWith("…"));
});

test("cards are 1200×630 JPEGs, with or without an image", async () => {
	const image = await sharp({
		create: { width: 300, height: 600, channels: 3, background: "#c00" },
	})
		.png()
		.toBuffer();
	for (const extra of [{}, { image }]) {
		const card = await renderCard({
			title: "less is more",
			label: "TIL",
			name: "Kanishk Pachauri",
			domain: "kanishkk.xyz",
			...extra,
		});
		const { width, height, format } = await sharp(card).metadata();
		assert.deepEqual(
			{ width, height, format },
			{ width: 1200, height: 630, format: "jpeg" },
		);
	}
});

test("meta values are read in order and unescaped", () => {
	const html =
		'<meta property="og:image" content="https://a/og/x.jpg"><meta property="og:image" content="https://a/assets/y.jpg">' +
		'<meta property="og:title" content="Tom &amp; Jerry&#39;s &quot;show&quot;">';
	assert.deepEqual(metaValues(html, "og:image"), [
		"https://a/og/x.jpg",
		"https://a/assets/y.jpg",
	]);
	assert.deepEqual(metaValues(html, "og:title"), [`Tom & Jerry's "show"`]);
});

test("measured widths are never narrower than the text as drawn", () => {
	const font = {
		loadSystemFonts: false,
		fontFiles: [new URL("./fonts/Inter-Bold.ttf", import.meta.url).pathname],
		defaultFontFamily: "Inter",
	};
	for (const text of [
		"AVATAR WAVE",
		"To Tokyo, Yay!",
		"How to give your agent a headless browser",
	]) {
		const drawn = new Resvg(
			`<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="120"><text x="0" y="80" font-family="Inter" font-weight="700" font-size="60">${text}</text></svg>`,
			{ font },
		).getBBox().width;
		assert.ok(
			measure(text, 60) >= drawn,
			`${text}: ${measure(text, 60)} < ${drawn}`,
		);
		// Without kerning, a line measures a little wider (up to ~8% for
		// pairs like AV and WA), so it may wrap a bit early, never late.
		assert.ok(
			measure(text, 60) < drawn * 1.1,
			`${text}: measured far too wide`,
		);
	}
});
