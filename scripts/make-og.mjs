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
	if (last && `${last} ${word}`.length <= 40)
		lines[lines.length - 1] += ` ${word}`;
	else lines.push(word);
}

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
	<rect width="100%" height="100%" fill="#fdfdfc"/>
	<rect y="${H - 14}" width="100%" height="14" fill="#1f5fbf"/>
	<text x="470" y="150" font-family="Helvetica, Arial, sans-serif" font-size="60" font-weight="700" fill="#1d2024">${escapeXml(site.name)}</text>
	<text x="470" y="205" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#5d636b">${escapeXml(site.title)} · kanishkk.xyz</text>
	${lines
		.slice(0, 5)
		.map(
			(line, i) =>
				`<text x="470" y="${290 + i * 44}" font-family="Charter, Georgia, serif" font-size="30" fill="#1d2024">${escapeXml(line)}</text>`,
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
	.flatten({ background: "#fdfdfc" })
	.jpeg({ quality: 85, mozjpeg: true })
	.toFile("public/og.jpg");
console.log("Wrote public/og.jpg");
