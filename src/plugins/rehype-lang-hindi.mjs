import { SKIP, visit } from "unist-util-visit";

// Pages are in English (<html lang="en">), so a screen reader reads Hindi
// written in Devanagari with English pronunciation, or skips it. Runs of
// Devanagari text are wrapped in <span lang="hi"> so they're read as Hindi.
// Spaces and punctuation between Devanagari words stay inside one run.
const RUN = /[ऀ-ॿ](?:[ऀ-ॿ\s,.;:!?'"“”‘’()–—-]*[ऀ-ॿ])?/g;
const SKIP_INSIDE = new Set(["code", "pre", "script", "style"]);

export function rehypeLangHindi() {
	return (tree) => {
		visit(tree, (node, index, parent) => {
			if (node.type === "element") {
				if (SKIP_INSIDE.has(node.tagName) || node.properties?.lang) return SKIP;
				return;
			}
			if (node.type !== "text" || !parent || index === undefined) return;
			if (!/[ऀ-ॿ]/.test(node.value)) return;
			const parts = [];
			let at = 0;
			for (const match of node.value.matchAll(RUN)) {
				if (match.index > at)
					parts.push({
						type: "text",
						value: node.value.slice(at, match.index),
					});
				parts.push({
					type: "element",
					tagName: "span",
					properties: { lang: "hi" },
					children: [{ type: "text", value: match[0] }],
				});
				at = match.index + match[0].length;
			}
			if (at < node.value.length)
				parts.push({ type: "text", value: node.value.slice(at) });
			parent.children.splice(index, 1, ...parts);
			return [SKIP, index + parts.length];
		});
	};
}
