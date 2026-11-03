import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPage, shareProblems } from "./check-built.mjs";

const head = (extra = "") =>
	`<meta property="og:image" content="https://kanishkk.xyz/og/a.jpg"><meta property="og:image:alt" content="A card">${extra}`;

test("structured data is allowed where JavaScript isn't", () => {
	const ld = '<script type="application/ld+json">{"@type":"Person"}</script>';
	assert.deepEqual(checkPage("a.html", ld), []);
	assert.equal(checkPage("a.html", `${ld}<script>alert(1)</script>`).length, 1);
});

test("a page's share image must exist and have alt text", () => {
	const files = new Map([["og/a.jpg", null]]);
	assert.deepEqual(shareProblems("a.html", head(), files), []);
	assert.match(
		shareProblems("a.html", head(), new Map()).join(),
		/doesn't exist/,
	);
	assert.match(shareProblems("a.html", "", files).join(), /no og:image/);
	assert.match(
		shareProblems(
			"a.html",
			'<meta property="og:image" content="https://kanishkk.xyz/og/a.jpg">',
			files,
		).join(),
		/no alt text/,
	);
	// Images on other hosts (the photo host) aren't in the build to check.
	assert.deepEqual(
		shareProblems(
			"a.html",
			'<meta property="og:image" content="https://photos.kanishkk.xyz/x.webp"><meta property="og:image:alt" content="A lake">',
			files,
		),
		[],
	);
});

test("structured data must be valid JSON", () => {
	const files = new Map([["og/a.jpg", null]]);
	const broken = head('<script type="application/ld+json">{"@type":</script>');
	assert.match(
		shareProblems("a.html", broken, files).join(),
		/isn't valid JSON/,
	);
});
