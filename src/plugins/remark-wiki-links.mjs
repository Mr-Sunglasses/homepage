import { buildIndex, resolve, WIKI_LINK } from "../lib/wiki.mjs";

// [[slug]], [[collection/slug]] or [[slug|label]] → a link to that page,
// labelled with its title unless a label is given. An unknown target (a typo,
// or a draft in a production build) is rendered struck through with class
// "wiki-missing"; the wikiLinkCheck integration then fails the build. The
// plugin itself never throws: Astro would publish the page with no body.
export function remarkWikiLinks({
	production = process.env.NODE_ENV === "production",
} = {}) {
	let index;
	let builtAt = 0;
	const currentIndex = () => {
		// Rebuilt at most once a second, so new pages resolve while `pnpm dev` runs.
		if (!index || Date.now() - builtAt > 1000) {
			index = buildIndex({ includeDrafts: !production });
			builtAt = Date.now();
		}
		return index;
	};

	return (tree, file) => {
		const walk = (node) => {
			if (!node.children) return;
			node.children = node.children.flatMap((child) => {
				if (child.type !== "text" || !child.value.includes("[[")) {
					walk(child);
					return [child];
				}
				return split(child.value, currentIndex(), file);
			});
		};
		walk(tree);
	};
}

function split(text, index, file) {
	const out = [];
	let at = 0;
	for (const match of text.matchAll(WIKI_LINK)) {
		const [whole, target, label] = match;
		if (match.index > at)
			out.push({ type: "text", value: text.slice(at, match.index) });
		const { entry, error } = resolve(index, target);
		if (entry) {
			out.push({
				type: "link",
				url: entry.url,
				data: { hProperties: { className: ["wiki"] } },
				children: [{ type: "text", value: label ?? entry.title }],
			});
		} else {
			file.message(`Wiki link [[${target}]]: ${error}`);
			out.push({
				type: "delete",
				data: { hProperties: { className: ["wiki-missing"], title: error } },
				children: [{ type: "text", value: label ?? target }],
			});
		}
		at = match.index + whole.length;
	}
	if (at < text.length) out.push({ type: "text", value: text.slice(at) });
	return out;
}
