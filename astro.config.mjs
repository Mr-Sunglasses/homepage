import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import remarkDirective from "remark-directive";
import { site } from "./src/config.ts";
import { ogCards } from "./src/plugins/og-cards.mjs";
import { rehypeEmbedsToLinks } from "./src/plugins/rehype-embeds-to-links.mjs";
import { rehypeImageHints } from "./src/plugins/rehype-image-hints.mjs";
import { rehypeLangHindi } from "./src/plugins/rehype-lang-hindi.mjs";
import { remarkDropTitleHeading } from "./src/plugins/remark-drop-title-heading.mjs";
import { remarkPlainDirectives } from "./src/plugins/remark-plain-directives.mjs";
import { remarkWikiLinks } from "./src/plugins/remark-wiki-links.mjs";
import { wikiLinkCheck } from "./src/plugins/wiki-link-check.mjs";

// Page URL → date it last changed, collected by ogCards for the sitemap.
const lastmods = new Map();

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
		// The stylesheet is ~9 KB (~2.5 KB compressed): inlining it saves a
		// round trip before anything can be drawn.
		inlineStylesheets: "always",
	},
	// Images in Markdown get a srcset, so phones don't download a 6000px
	// photo. The column is ~680px wide; 1360 covers 2x screens.
	image: {
		layout: "constrained",
		responsiveStyles: false,
		breakpoints: [400, 680, 1020, 1360],
	},
	integrations: [
		wikiLinkCheck(),
		// Share cards for pages without their own image. Before sitemap: its
		// build step reads the dates this one collects.
		ogCards({ site: site.url, name: site.name, lastmods }),
		sitemap({
			filter: (page) => !page.includes("/drafts/"),
			serialize: (item) => {
				const lastmod = lastmods.get(item.url);
				return lastmod ? { ...item, lastmod } : item;
			},
		}),
	],
	markdown: {
		remarkPlugins: [
			remarkDirective,
			remarkPlainDirectives,
			remarkDropTitleHeading,
			remarkWikiLinks,
		],
		rehypePlugins: [rehypeEmbedsToLinks, rehypeImageHints, rehypeLangHindi],
		shikiConfig: {
			themes: { light: "github-light", dark: "github-dark" },
			wrap: true,
		},
	},
});
