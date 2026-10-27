import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import remarkDirective from "remark-directive";
import { rehypeEmbedsToLinks } from "./src/plugins/rehype-embeds-to-links.mjs";
import { remarkDropTitleHeading } from "./src/plugins/remark-drop-title-heading.mjs";
import { remarkPlainDirectives } from "./src/plugins/remark-plain-directives.mjs";

// https://astro.build/config
export default defineConfig({
	site: "https://kanishkk.xyz/",
	trailingSlash: "always",
	// Emit hashed build assets under /assets instead of the default /_astro.
	// Social crawlers (e.g. Twitterbot) cache robots.txt per-host for ~24h; an
	// earlier `Disallow: /_astro/` on the old blog made X skip OG cover images.
	// Serving assets from /assets sidesteps that. Don't change it back.
	build: {
		assets: "assets",
	},
	integrations: [
		sitemap({
			filter: (page) => !page.includes("/drafts/"),
		}),
	],
	markdown: {
		remarkPlugins: [
			remarkDirective,
			remarkPlainDirectives,
			remarkDropTitleHeading,
		],
		rehypePlugins: [rehypeEmbedsToLinks],
		shikiConfig: {
			themes: { light: "github-light", dark: "github-dark" },
			wrap: true,
		},
	},
});
