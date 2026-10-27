import assert from "node:assert/strict";
import { test } from "node:test";
import {
	publishedPath,
	relativeRefs,
	setFrontmatter,
	slugify,
	today,
} from "./drafts.mjs";

test("posts and pages keep their path under src/content", () => {
	assert.equal(
		publishedPath("drafts/posts/poems/rain.md", "2026-11-02"),
		"src/content/posts/poems/rain.md",
	);
	assert.equal(
		publishedPath("drafts/pages/now.md", "2026-11-02"),
		"src/content/pages/now.md",
	);
});

test("notes and links move to the publish date", () => {
	assert.equal(
		publishedPath("drafts/notes/2026/2026-10-27-telegram.md", "2027-01-03"),
		"src/content/notes/2027/2027-01-03-telegram.md",
	);
	assert.equal(
		publishedPath("./drafts/links/2026/2026-10-27-essay.md", "2026-10-28"),
		"src/content/links/2026/2026-10-28-essay.md",
	);
});

test("TILs keep their slug when published", () => {
	assert.equal(
		publishedPath("drafts/tils/less-is-more.md", "2026-11-02"),
		"src/content/tils/less-is-more.md",
	);
});

test("only files in drafts/ can be published", () => {
	assert.throws(() => publishedPath("src/content/posts/a.md", "2026-10-28"));
});

test("setFrontmatter replaces or adds a key without touching the body", () => {
	const text = "---\ntitle: A\ndate: 2026-01-01\n---\ndate: in body\n";
	assert.equal(
		setFrontmatter(text, "date", "2026-10-28"),
		"---\ntitle: A\ndate: 2026-10-28\n---\ndate: in body\n",
	);
	assert.equal(
		setFrontmatter("---\ntitle: Now\n---\n", "updated", "2026-10-28"),
		"---\ntitle: Now\nupdated: 2026-10-28\n---\n",
	);
});

test("relativeRefs finds frontmatter and Markdown images once each", () => {
	const text =
		"---\nimage: './assets/images/cover.png'\n---\n![a](./assets/images/a.png) ![b](./assets/images/cover.png) [web](https://x.org/a.png)";
	assert.deepEqual(relativeRefs(text), [
		"./assets/images/cover.png",
		"./assets/images/a.png",
	]);
});

test("slugify and today", () => {
	assert.equal(
		slugify("Liberate Telegram ⛓️, Selfhost!"),
		"liberate-telegram-selfhost",
	);
	assert.equal(today(new Date(2026, 0, 5)), "2026-01-05");
});
