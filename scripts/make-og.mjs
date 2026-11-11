#!/usr/bin/env node
// Draws the default share image (public/og.jpg, 1200×630) shown when a page
// without its own image is shared: the photo, the names and the address.
// Run again after changing the photo or the intro: node scripts/make-og.mjs
import sharp from "sharp";
import { site } from "../src/config.ts";

const W = 1200;
const H = 630;
const PHOTO = 300;
const escapeXml = (s) =>
	s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// The intro, wrapped to fit beside the photo.
const words = site.intro.split(" ");
const lines = [];
for (const word of words) {
	const last = lines.at(-1);
	if (last && `${last} ${word}`.length <= 41)
		lines[lines.length - 1] += ` ${word}`;
	else lines.push(word);
}

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
	<rect width="100%" height="100%" fill="#fff"/>
	<rect y="${H - 14}" width="100%" height="14" fill="#3273dc"/>
	<text x="470" y="150" font-family="Verdana, sans-serif" font-size="60" font-weight="700" fill="#222">${escapeXml(site.name)}</text>
	<text x="470" y="205" font-family="Verdana, sans-serif" font-size="32" fill="#444">${escapeXml(site.title)} · kanishkk.xyz</text>
	${lines
		.slice(0, 5)
		.map(
			(line, i) =>
				`<text x="470" y="${290 + i * 44}" font-family="Verdana, sans-serif" font-size="28" fill="#444">${escapeXml(line)}</text>`,
		)
		.join("\n\t")}
</svg>`;

const round = Buffer.from(
	`<svg width="${PHOTO}" height="${PHOTO}"><circle cx="${PHOTO / 2}" cy="${PHOTO / 2}" r="${PHOTO / 2}"/></svg>`,
);
const photo = await sharp("src/assets/avatar.jpg")
	.resize(PHOTO, PHOTO)
	.composite([{ input: round, blend: "dest-in" }])
	.png()
	.toBuffer();

await sharp(Buffer.from(text))
	.composite([{ input: photo, left: 110, top: (H - PHOTO) / 2 - 7 }])
	.flatten({ background: "#fff" })
	.jpeg({ quality: 85, mozjpeg: true })
	.toFile("public/og.jpg");
console.log("Wrote public/og.jpg");
