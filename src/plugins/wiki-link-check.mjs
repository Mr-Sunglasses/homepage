import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Fails `astro build` if any page has an unresolved [[wiki link]]: a typo,
// or a link from a published page to a draft (which would reveal it).
export function wikiLinkCheck() {
	return {
		name: "wiki-link-check",
		hooks: {
			"astro:build:done": ({ dir }) => {
				const root = fileURLToPath(dir);
				const html = (d) =>
					readdirSync(d).flatMap((name) => {
						const path = join(d, name);
						if (statSync(path).isDirectory())
							return name === "admin" ? [] : html(path);
						return name.endsWith(".html") ? [path] : [];
					});
				const broken = html(root).flatMap((path) =>
					[
						...readFileSync(path, "utf8").matchAll(
							/class="wiki-missing"[^>]*>([^<]*)</g,
						),
					].map(([, target]) => `${relative(root, path)}: [[${target}]]`),
				);
				if (broken.length > 0) {
					throw new Error(
						`Wiki links that don't resolve (a typo, or a link to a draft):\n  ${broken.join("\n  ")}`,
					);
				}
			},
		},
	};
}
