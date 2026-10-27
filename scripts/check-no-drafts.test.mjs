import assert from "node:assert/strict";
import { test } from "node:test";
import { findProblems, hasDraftKey } from "./check-no-drafts.mjs";

test("anything under drafts/ is refused", () => {
	const problems = findProblems(
		[
			"drafts/posts/a.md",
			"drafts/posts/assets/x.png",
			"src/content/posts/b.md",
		],
		() => "---\ntitle: B\n---\n",
	);
	assert.equal(problems.length, 2);
	assert.match(problems[0], /^drafts\/posts\/a\.md/);
});

test("a draft key in frontmatter is refused, true or false", () => {
	assert.equal(hasDraftKey("---\ntitle: A\ndraft: true\n---\nbody"), true);
	assert.equal(hasDraftKey("---\ndraft: false\n---\n"), true);
});

test("the word draft in the body is fine", () => {
	assert.equal(hasDraftKey("---\ntitle: A\n---\ndraft: my thoughts"), false);
	assert.equal(hasDraftKey("no frontmatter\ndraft: x"), false);
});

test("non-markdown files are not read", () => {
	const problems = findProblems(["public/og.png"], () => {
		throw new Error("should not read");
	});
	assert.deepEqual(problems, []);
});
