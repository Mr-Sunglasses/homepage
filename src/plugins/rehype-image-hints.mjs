// Loading hints for images in Markdown:
//   - `sizes` says how wide an image is drawn (at most the text column, not
//     the whole window), so a browser picks the smallest copy that's sharp.
//   - Images load lazily, which is right below the fold but slows the page
//     when an image is the first thing on screen (a cover photo). An image
//     within the first few blocks loads straight away instead.
export const COLUMN_SIZES = "(min-width: 44rem) 680px, calc(100vw - 2rem)";
const NEAR_TOP = 3;

export function rehypeImageHints() {
	return (tree) => {
		const blocks = tree.children.filter((node) => node.type === "element");
		const images = blocks.flatMap((block, i) =>
			imagesIn(block).map((img) => ({ img, nearTop: i < NEAR_TOP })),
		);
		for (const { img } of images) img.properties.sizes = COLUMN_SIZES;
		const first = images[0];
		if (first?.nearTop) {
			first.img.properties.loading = "eager";
			first.img.properties.fetchpriority = "high";
		}
	};
}

function imagesIn(node) {
	if (node.type !== "element") return [];
	if (node.tagName === "img") return [node];
	return (node.children ?? []).flatMap(imagesIn);
}
