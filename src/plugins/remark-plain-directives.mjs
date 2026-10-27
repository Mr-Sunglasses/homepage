import { visit } from "unist-util-visit";

const CALLOUTS = {
	note: "Note",
	tip: "Tip",
	important: "Important",
	warning: "Warning",
	caution: "Caution",
};

const REPO = /^[\w.-]+\/[\w.-]+$/;

// Turns the directives used in posts into plain HTML:
//   :::note[Optional title] … :::   → <aside class="callout callout-note">
//   ::github{repo="owner/name"}     → a paragraph linking to the repo
// Any other directive is put back as the text it was written as, so prose
// like "port:8080" or "see:this" is never silently swallowed.
export function remarkPlainDirectives() {
	return (tree) => {
		visit(tree, (node, index, parent) => {
			if (!parent || index === undefined) return;

			if (node.type === "containerDirective" && node.name in CALLOUTS) {
				const first = node.children[0];
				const label = first?.data?.directiveLabel ? first.children : null;
				if (label) node.children.shift();
				node.data = {
					hName: "aside",
					hProperties: { className: ["callout", `callout-${node.name}`] },
				};
				node.children.unshift({
					type: "paragraph",
					data: { hProperties: { className: ["callout-title"] } },
					children: label ?? [{ type: "text", value: CALLOUTS[node.name] }],
				});
				return;
			}

			if (
				node.type === "leafDirective" &&
				node.name === "github" &&
				REPO.test(node.attributes?.repo ?? "")
			) {
				const repo = node.attributes.repo;
				parent.children[index] = {
					type: "paragraph",
					data: { hProperties: { className: ["repo"] } },
					children: [
						{ type: "text", value: "Code: " },
						{
							type: "link",
							url: `https://github.com/${repo}`,
							children: [{ type: "text", value: `github.com/${repo}` }],
						},
					],
				};
				return;
			}

			if (
				node.type === "textDirective" ||
				node.type === "leafDirective" ||
				node.type === "containerDirective"
			) {
				parent.children.splice(index, 1, ...restore(node));
				return index;
			}
		});
	};
}

function restore(node) {
	const colons = { textDirective: ":", leafDirective: "::" }[node.type];
	if (!colons) {
		// Unknown container: keep its content, drop the fence.
		return node.children;
	}
	const attrs = Object.entries(node.attributes ?? {});
	const parts = [{ type: "text", value: `${colons}${node.name}` }];
	if (node.children.length > 0) {
		parts[0].value += "[";
		parts.push(...node.children, { type: "text", value: "]" });
	}
	if (attrs.length > 0) {
		const list = attrs.map(([k, v]) => (v ? `${k}="${v}"` : k)).join(" ");
		parts.push({ type: "text", value: `{${list}}` });
	}
	return node.type === "leafDirective"
		? [{ type: "paragraph", children: parts }]
		: parts;
}
