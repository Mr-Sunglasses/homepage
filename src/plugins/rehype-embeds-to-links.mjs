import { SKIP, visit } from "unist-util-visit";

const RAW_IFRAME =
	/(?:<div\b[^>]*>\s*)?<iframe\b([^>]*)>\s*<\/iframe>(?:\s*<\/div>)?/gi;

// Replaces <iframe> embeds (YouTube, Giphy, …) with a plain link, so pages
// load no third-party scripts or trackers. A wrapper <div> whose only
// content is the iframe (the old responsive-embed trick) is replaced too.
// HTML written inside Markdown arrives as `raw` nodes, so those are
// rewritten as strings; parsed elements are rewritten as nodes.
export function rehypeEmbedsToLinks() {
	return (tree) => {
		visit(tree, "raw", (node) => {
			node.value = node.value.replace(RAW_IFRAME, (_, attrs) => {
				const src = attr(attrs, "src");
				if (!src) return "";
				const { href, text } = describe(src, attr(attrs, "title"));
				return `<p class="embed"><a href="${escapeHtml(href)}">${escapeHtml(text)}</a></p>`;
			});
		});

		visit(tree, "element", (node, index, parent) => {
			if (!parent || index === undefined) return;
			const iframe = node.tagName === "iframe" ? node : onlyIframe(node);
			const src = iframe?.properties?.src;
			if (!src) return;
			const { href, text } = describe(String(src), iframe.properties.title);
			parent.children[index] = {
				type: "element",
				tagName: "p",
				properties: { className: ["embed"] },
				children: [
					{
						type: "element",
						tagName: "a",
						properties: { href },
						children: [{ type: "text", value: text }],
					},
				],
			};
			return [SKIP, index];
		});
	};
}

function attr(attrs, name) {
	return attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1];
}

function escapeHtml(text) {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function onlyIframe(node) {
	if (node.tagName !== "div" && node.tagName !== "p") return null;
	const meaningful = node.children.filter(
		(c) => !(c.type === "text" && c.value.trim() === ""),
	);
	const [only] = meaningful;
	return meaningful.length === 1 && only.tagName === "iframe" ? only : null;
}

export function describe(src, title) {
	const url = new URL(src, "https://example.invalid");
	const named =
		title && !/^(youtube video player|embedded content)$/i.test(title)
			? `: ${title}`
			: "";

	const youtube = url.pathname.match(/^\/embed\/([\w-]{6,})/);
	if (/(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname) && youtube) {
		return {
			href: `https://www.youtube.com/watch?v=${youtube[1]}`,
			text: `▶ Video on YouTube${named}`,
		};
	}

	const giphy = url.pathname.match(/^\/embed\/(\w+)/);
	if (/(^|\.)giphy\.com$/.test(url.hostname) && giphy) {
		return {
			href: `https://giphy.com/gifs/${giphy[1]}`,
			text: `GIF on Giphy${named}`,
		};
	}

	return {
		href: url.href,
		text: `Embedded content on ${url.hostname.replace(/^www\./, "")}${named}`,
	};
}
