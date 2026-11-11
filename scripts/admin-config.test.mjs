// The admin panel (public/admin/config.js) refuses to start on any mistake
// in its configuration, and nothing else would notice: check the mistakes
// it has made before.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(
	new URL("../public/admin/config.js", import.meta.url),
	"utf8",
);
const configFor = (hostname) => {
	const window = {};
	vm.runInNewContext(source, { window, location: { hostname } });
	return window.SITE_CMS_CONFIG;
};

for (const [where, hostname] of [
	["online", "kanishkk.xyz"],
	["locally", "localhost"],
]) {
	test(`sortable fields exist in their collection (${where})`, () => {
		for (const collection of configFor(hostname).collections) {
			const names = new Set((collection.fields ?? []).map((f) => f.name));
			for (const field of collection.sortable_fields?.fields ?? []) {
				assert.ok(
					names.has(field),
					`${collection.name}: sorts by "${field}", which it doesn't have`,
				);
			}
		}
	});
}

test("drafts are only offered locally", () => {
	const online = configFor("kanishkk.xyz").collections.map((c) => c.name);
	assert.ok(online.length > 0);
	assert.ok(online.every((name) => !name.startsWith("draft-")));
	const local = configFor("localhost").collections.map((c) => c.name);
	assert.ok(local.some((name) => name.startsWith("draft-")));
});

test("GitHub sign-in asks for public repos only", () => {
	assert.equal(configFor("kanishkk.xyz").backend.auth_scope, "public_repo");
});
