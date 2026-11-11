// Cloudflare tells browsers to keep /admin/config.js for hours, so an
// admin panel opened after a config change kept the old fields. After each
// build, load the config under a name that changes with its content:
// /admin/config.js?v=<hash>.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const versioned = (html, config) => {
	const hash = createHash("sha256").update(config).digest("hex").slice(0, 10);
	const tag = '<script src="/admin/config.js"></script>';
	if (!html.includes(tag)) throw new Error(`admin/index.html has no ${tag}`);
	return html.replace(
		tag,
		`<script src="/admin/config.js?v=${hash}"></script>`,
	);
};

export const adminCacheBust = () => ({
	name: "admin-cache-bust",
	hooks: {
		"astro:build:done": async ({ dir }) => {
			const page = fileURLToPath(new URL("admin/index.html", dir));
			const config = await readFile(new URL("admin/config.js", dir));
			await writeFile(page, versioned(await readFile(page, "utf8"), config));
		},
	},
});
