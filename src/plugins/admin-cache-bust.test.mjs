import assert from "node:assert/strict";
import { test } from "node:test";
import { versioned } from "./admin-cache-bust.mjs";

const page = '<script src="/admin/config.js"></script>';

test("the config's address changes with its content", () => {
	const a = versioned(page, "one");
	const b = versioned(page, "two");
	assert.match(a, /\/admin\/config\.js\?v=[0-9a-f]{10}"/);
	assert.notEqual(a, b);
	assert.equal(a, versioned(page, "one"));
});

test("a page without the config tag fails the build", () => {
	assert.throws(() => versioned("<p>nothing</p>", "one"));
});
