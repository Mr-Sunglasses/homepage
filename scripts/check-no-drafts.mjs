#!/usr/bin/env node
// Refuses to let drafts into git.
//   node scripts/check-no-drafts.mjs --staged   pre-commit hook: checks the index
//   node scripts/check-no-drafts.mjs            CI: checks every tracked file
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// `read(file)` returns the file's text as it would be committed.
export function findProblems(files, read) {
	const problems = [];
	for (const file of files) {
		if (file === "drafts" || file.startsWith("drafts/")) {
			problems.push(`${file}: files in drafts/ are never committed`);
		} else if (file.endsWith(".md") && hasDraftKey(read(file))) {
			problems.push(
				`${file}: has a "draft:" key; unfinished work belongs in drafts/`,
			);
		}
	}
	return problems;
}

export function hasDraftKey(text) {
	const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
	return /^draft\s*:/m.test(frontmatter);
}

const git = (...args) =>
	execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const staged = process.argv.includes("--staged");
	const files = (
		staged
			? git("diff", "--cached", "--name-only", "--diff-filter=ACMR")
			: git("ls-files")
	)
		.split("\n")
		.filter(Boolean);
	const read = staged
		? (file) => git("show", `:${file}`)
		: (file) => readFileSync(file, "utf8");

	const problems = findProblems(files, read);
	if (problems.length > 0) {
		console.error("Drafts must never leave this machine:\n");
		for (const problem of problems) console.error(`  ${problem}`);
		if (staged) {
			console.error("\nUnstage them with: git restore --staged <file>");
		}
		process.exit(1);
	}
}
