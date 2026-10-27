import { toString as mdastToString } from "mdast-util-to-string";

// Pages already show the frontmatter title as their <h1>. Many older posts
// also start with "# Title", which then appeared twice; drop that heading
// when it says the same thing (ignoring case and punctuation).
export function remarkDropTitleHeading() {
	return (tree, file) => {
		const title = file.data?.astro?.frontmatter?.title;
		const first = tree.children.find((node) => node.type !== "yaml");
		if (!title || first?.type !== "heading" || first.depth > 2) return;
		if (normalize(mdastToString(first)) === normalize(title)) {
			tree.children.splice(tree.children.indexOf(first), 1);
		}
	};
}

const normalize = (text) =>
	text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
