// Draws the share cards (src/lib/og.mjs) once the site is built: every page
// whose og:image points at /og/ gets a 1200×630 JPEG with its title, what
// kind of page it is, and my name. A second og:image on the page (a post's
// cover that doesn't suit a link preview) is shown beside the title.
//
// Text is set in Inter (src/plugins/fonts, SIL Open Font License) by resvg,
// which uses only those files, never the machine's fonts: cards come out
// the same everywhere. Lines are wrapped using the font's own glyph widths
// (opentype.js): measuring with resvg would mean thousands of renders.
//
// It also notes each page's date (article:modified_time, else
// article:published_time) for the sitemap's <lastmod>.
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";
import sharp from "sharp";
import { CARD, cardLabel, cardTitle } from "../lib/og.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const FONTS = {
	loadSystemFonts: false,
	fontFiles: [
		here("./fonts/Inter-Bold.ttf"),
		here("./fonts/Inter-Regular.ttf"),
	],
	defaultFontFamily: "Inter",
};
const AVATAR = here("../assets/avatar.jpg");
const bold = (() => {
	const file = readFileSync(here("./fonts/Inter-Bold.ttf"));
	return opentype.parse(
		file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
	);
})();

// The site's light theme (src/styles/global.css).
const BG = "#fdfdfc";
const FG = "#1d2024";
const MUTED = "#5d636b";
const ACCENT = "#1f5fbf";
const SOFT = "#f3f4f6";

const PAD = 80;
const BAR = 14;
const PANEL = 440; // width of the image panel, when there is one
const TITLE_TOP = 150;
const TITLE_MAX_HEIGHT = 300;
const TITLE_SIZES = [68, 60, 52, 46, 40];
const LINE_HEIGHT = 1.15;
const AVATAR_SIZE = 72;

const escapeXml = (s) =>
	s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

const svg = (body, width = CARD.width, height = CARD.height) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`;

// One line of text; `y` is its baseline.
const textLine = (line, { x, y, size, weight = 700, fill = FG, spacing = 0 }) =>
	`<text x="${x}" y="${y}" font-family="Inter" font-weight="${weight}" font-size="${size}" letter-spacing="${spacing}" fill="${fill}">${escapeXml(line)}</text>`;

/**
 * How wide a line of bold text is at `size`, in pixels: the sum of its
 * glyphs' advance widths. Kerning only ever tightens a line as drawn, so a
 * line that fits here fits on the card.
 */
export function measure(line, size) {
	let units = 0;
	for (const char of line) units += bold.charToGlyph(char).advanceWidth ?? 0;
	return (units * size) / bold.unitsPerEm;
}

/** Words into lines no wider than `width`, or null if a word alone is wider. */
function wrap(words, size, width) {
	const lines = [];
	for (const word of words) {
		const last = lines.at(-1);
		if (last !== undefined && measure(`${last} ${word}`, size) <= width) {
			lines[lines.length - 1] = `${last} ${word}`;
		} else {
			if (measure(word, size) > width) return null;
			lines.push(word);
		}
	}
	return lines;
}

/** `text` shortened with "…" until it's no wider than `width`. */
function shorten(text, size, width) {
	if (measure(text, size) <= width) return text;
	const words = text.split(" ");
	while (words.length > 1 && measure(`${words.join(" ")}…`, size) > width) {
		words.pop();
	}
	let kept = words.join(" ");
	// One word too long for a line on its own: cut it.
	while (kept.length > 1 && measure(`${kept}…`, size) > width) {
		kept = kept.slice(0, -1);
	}
	return `${kept}…`;
}

/** The title's lines at the largest size that fits; long titles are shortened. */
export function fitTitle(title, width) {
	const words = title.split(" ");
	for (const size of TITLE_SIZES) {
		const lines = wrap(words, size, width);
		if (lines && lines.length * size * LINE_HEIGHT <= TITLE_MAX_HEIGHT) {
			return { lines, size };
		}
	}
	// Too long even at the smallest size: as many lines as fit, the last
	// one ending in "…". One pass, so a very long title stays quick.
	const size = TITLE_SIZES.at(-1);
	const maxLines = Math.floor(TITLE_MAX_HEIGHT / (size * LINE_HEIGHT));
	const lines = [];
	let used = 0;
	for (const word of words) {
		const last = lines.at(-1);
		if (last !== undefined && measure(`${last} ${word}`, size) <= width) {
			lines[lines.length - 1] = `${last} ${word}`;
		} else if (lines.length < maxLines) {
			lines.push(shorten(word, size, width));
		} else break;
		used++;
	}
	if (used < words.length) {
		lines[lines.length - 1] = shorten(`${lines.at(-1)}…`, size, width);
	}
	return { lines, size };
}

let avatar;
async function roundAvatar() {
	const mask = Buffer.from(
		svg(
			`<circle cx="${AVATAR_SIZE / 2}" cy="${AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}"/>`,
			AVATAR_SIZE,
			AVATAR_SIZE,
		),
	);
	avatar ??= await sharp(AVATAR)
		.resize(AVATAR_SIZE, AVATAR_SIZE)
		.composite([{ input: mask, blend: "dest-in" }])
		.png()
		.toBuffer();
	return avatar;
}

/**
 * A 1200×630 JPEG card. `image` (a file's contents), if given, is shown
 * whole in a panel on the right.
 */
export async function renderCard({ title, label = "", name, domain, image }) {
	const width = CARD.width - PAD * 2 - (image ? PANEL - 40 : 0);
	// A title the font can't draw at all (say, all in Devanagari) gives way
	// to my name, so the card is never blank.
	const { lines, size } = fitTitle(cardTitle(title) || name, width);
	const footerTop = CARD.height - BAR - 56 - AVATAR_SIZE;
	const textX = PAD + AVATAR_SIZE + 20;

	const shapes = [
		`<rect width="100%" height="100%" fill="${BG}"/>`,
		image
			? `<rect x="${CARD.width - PANEL}" width="${PANEL}" height="${CARD.height}" fill="${SOFT}"/>`
			: "",
		`<rect y="${CARD.height - BAR}" width="100%" height="${BAR}" fill="${ACCENT}"/>`,
		label
			? textLine(label.toUpperCase(), {
					x: PAD,
					y: 110,
					size: 24,
					fill: ACCENT,
					spacing: 2,
				})
			: "",
		...lines.map((line, i) =>
			textLine(line, {
				x: PAD,
				y: Math.round(TITLE_TOP + size * 0.97 + i * size * LINE_HEIGHT),
				size,
			}),
		),
		textLine(name, { x: textX, y: footerTop + 32, size: 28 }),
		textLine(domain, {
			x: textX,
			y: footerTop + 66,
			size: 24,
			weight: 400,
			fill: MUTED,
		}),
	];
	const drawn = new Resvg(svg(shapes.join("")), { font: FONTS })
		.render()
		.asPng();

	const layers = [{ input: await roundAvatar(), left: PAD, top: footerTop }];
	if (image) {
		const box = { width: PANEL - 80, height: CARD.height - BAR - 80 };
		const fitted = await sharp(image)
			.resize({ ...box, fit: "inside" })
			.toBuffer({ resolveWithObject: true });
		layers.push({
			input: fitted.data,
			left: CARD.width - PANEL + Math.round((PANEL - fitted.info.width) / 2),
			top: Math.round((CARD.height - BAR - fitted.info.height) / 2),
		});
	}
	return sharp(drawn)
		.composite(layers)
		.flatten({ background: BG })
		.jpeg({ quality: 82, mozjpeg: true })
		.toBuffer();
}

const unescapeHtml = (s) =>
	s
		.replace(/&#x([0-9a-f]+);/gi, (_, n) =>
			String.fromCodePoint(Number.parseInt(n, 16)),
		)
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replaceAll("&quot;", '"')
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&");

/** The content of every <meta property|name="key"> on a page, in order. */
export function metaValues(html, key) {
	const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return [
		...html.matchAll(
			new RegExp(`<meta (?:property|name)="${escaped}" content="([^"]*)"`, "g"),
		),
	].map(([, value]) => unescapeHtml(value));
}

async function htmlFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true, recursive: true });
	return entries
		.filter((e) => e.isFile() && e.name.endsWith(".html"))
		.map((e) => join(e.parentPath, e.name));
}

/**
 * The integration. `lastmods` is filled with page URL → date, for the
 * sitemap; list this integration before @astrojs/sitemap.
 */
export function ogCards({ site, name, lastmods = new Map() }) {
	return {
		name: "og-cards",
		hooks: {
			"astro:build:done": async ({ dir, logger }) => {
				const root = fileURLToPath(dir);
				const origin = new URL(site).origin;
				const jobs = [];
				for (const file of await htmlFiles(root)) {
					const path = relative(root, file).split("\\").join("/");
					if (path.startsWith("admin/") || path.startsWith("drafts/")) continue;
					const html = await readFile(file, "utf8");
					const pageUrl = `${origin}/${path.replace(/(^|\/)index\.html$/, "$1")}`;
					const date =
						metaValues(html, "article:modified_time")[0] ??
						metaValues(html, "article:published_time")[0];
					if (date) lastmods.set(pageUrl, date);

					const [card, cover] = metaValues(html, "og:image");
					if (!card?.startsWith(`${origin}/og/`)) continue;
					const title = metaValues(html, "og:title")[0];
					if (!title) throw new Error(`${path}: a share card needs og:title`);
					const coverFile =
						cover?.startsWith(`${origin}/`) &&
						join(root, decodeURIComponent(new URL(cover).pathname));
					jobs.push({
						out: join(root, decodeURIComponent(new URL(card).pathname)),
						title,
						label: cardLabel(path.replace(/index\.html$/, ""), title),
						cover: coverFile && existsSync(coverFile) ? coverFile : undefined,
					});
				}
				const started = Date.now();
				// A few at a time: each card is a handful of sharp calls.
				for (let i = 0; i < jobs.length; i += 8) {
					await Promise.all(
						jobs.slice(i, i + 8).map(async (job) => {
							const jpeg = await renderCard({
								title: job.title,
								label: job.label,
								name,
								domain: new URL(site).host,
								image: job.cover && (await readFile(job.cover)),
							});
							await mkdir(dirname(job.out), { recursive: true });
							await writeFile(job.out, jpeg);
						}),
					);
				}
				logger.info(
					`${jobs.length} share cards drawn in ${Date.now() - started}ms`,
				);
			},
		},
	};
}
