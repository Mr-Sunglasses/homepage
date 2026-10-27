// Where photo files live in the stores. Shared by the site (to build URLs)
// and scripts/photos-*.mjs (to upload and verify), so the two never disagree.
//
//   photos bucket     trips/<trip>/<id>-<width>.<format>   public, metadata stripped
//   originals bucket  trips/<trip>/<id>.<ext>              private, untouched

export const WIDTHS = [640, 1280, 2048];
export const FORMATS = ["avif", "webp"];

/** Variant widths for an image `width` pixels wide; never upscales. */
export function variantWidths(width) {
	const widths = WIDTHS.filter((w) => w <= width);
	return widths.length > 0 ? widths : [width];
}

/** @param {string} trip @param {string} id @param {number} width @param {string} format */
export const variantKey = (trip, id, width, format) =>
	`trips/${trip}/${id}-${width}.${format}`;

/** @param {string} trip @param {string} id @param {string} ext */
export const originalKey = (trip, id, ext) => `trips/${trip}/${id}.${ext}`;
