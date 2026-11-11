#!/usr/bin/env node
// Draws the site's icon, a cat's head, in the link colour of each theme:
// public/favicon/favicon-{light,dark}-{32,128,180,192}.png and
// public/favicon.ico (16 and 32 px). Run again after changing the drawing
// or the colours: node scripts/make-favicon.mjs
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

// The link colours in src/styles/global.css.
const THEMES = { light: "#3273dc", dark: "#8cc2dd" };
const SIZES = [32, 128, 180, 192];

// Two ears, a round head, and the eyes and nose cut out of it.
const cat = (color) =>
	Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
	<defs>
		<mask id="face">
			<rect width="64" height="64" fill="#fff"/>
			<ellipse cx="22.5" cy="37" rx="3.6" ry="4.8" fill="#000"/>
			<ellipse cx="41.5" cy="37" rx="3.6" ry="4.8" fill="#000"/>
			<path d="M28.5 45.5h7L32 49.5z" fill="#000"/>
		</mask>
	</defs>
	<g fill="${color}" mask="url(#face)">
		<path d="M6 5 30 19 10 33z"/>
		<path d="M58 5 34 19 54 33z"/>
		<ellipse cx="32" cy="38" rx="27" ry="22"/>
	</g>
</svg>`);

const png = (color, size) =>
	sharp(cat(color), { density: 72 * (size / 64) * 2 })
		.resize(size, size)
		.png()
		.toBuffer();

for (const [theme, color] of Object.entries(THEMES)) {
	for (const size of SIZES) {
		const file = `public/favicon/favicon-${theme}-${size}.png`;
		await writeFile(file, await png(color, size));
	}
}

// An .ico is a small directory of PNGs.
const icons = [16, 32].map((size) => ({ size }));
for (const icon of icons) icon.data = await png(THEMES.light, icon.size);
const header = Buffer.alloc(6 + 16 * icons.length);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icons.length, 4);
let offset = header.length;
icons.forEach(({ size, data }, i) => {
	const at = 6 + 16 * i;
	header.writeUInt8(size, at);
	header.writeUInt8(size, at + 1);
	header.writeUInt16LE(1, at + 4); // colour planes
	header.writeUInt16LE(32, at + 6); // bits per pixel
	header.writeUInt32LE(data.length, at + 8);
	header.writeUInt32LE(offset, at + 12);
	offset += data.length;
});
await writeFile(
	"public/favicon.ico",
	Buffer.concat([header, ...icons.map((i) => i.data)]),
);
console.log("Wrote public/favicon/ and public/favicon.ico");
