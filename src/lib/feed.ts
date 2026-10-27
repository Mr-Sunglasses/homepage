import { render } from "astro:content";
import rss, { type RSSFeedItem } from "@astrojs/rss";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import sanitizeHtml from "sanitize-html";
import { site } from "@/config";
import {
	type Link,
	type Note,
	noteLabel,
	noteUrl,
	type Post,
	postUrl,
} from "@/lib/content";

let container: AstroContainer | undefined;

// The entry's HTML exactly as the site renders it, with absolute URLs so
// images and links work in feed readers.
async function html(entry: Post | Note | Link) {
	container ??= await AstroContainer.create();
	const { Content } = await render(entry);
	const out = await container.renderToString(Content);
	return sanitizeHtml(out, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "aside"]),
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			img: ["src", "alt", "width", "height"],
		},
		transformTags: {
			a: absolute("a", "href"),
			img: absolute("img", "src"),
		},
	});
}

function absolute(tagName: string, attr: string) {
	return (_: string, attribs: Record<string, string>) => ({
		tagName,
		attribs: attribs[attr]
			? { ...attribs, [attr]: new URL(attribs[attr], site.url).href }
			: attribs,
	});
}

export async function postFeedItem(post: Post): Promise<RSSFeedItem> {
	return {
		title: post.data.title,
		pubDate: post.data.date,
		description: post.data.description,
		link: postUrl(post),
		categories: post.data.tags,
		content: await html(post),
	};
}

export async function noteFeedItem(note: Note): Promise<RSSFeedItem> {
	const lead = note.data.link
		? `<p>↗ <a href="${note.data.link}">${note.data.linkTitle ?? note.data.link}</a></p>`
		: "";
	return {
		title: note.data.link
			? `↗ ${note.data.linkTitle ?? noteLabel(note)}`
			: noteLabel(note),
		pubDate: note.data.date,
		link: noteUrl(note),
		categories: note.data.tags,
		content: lead + (await html(note)),
	};
}

export async function linkFeedItem(link: Link): Promise<RSSFeedItem> {
	return {
		title: `↗ ${link.data.title}`,
		pubDate: link.data.date,
		// The item points at the recommended page, like a link blog should.
		link: link.data.url,
		categories: link.data.tags,
		content: await html(link),
	};
}

export function feed(
	title: string,
	description: string,
	items: RSSFeedItem[],
	site: URL | undefined,
) {
	return rss({
		title,
		description,
		site: site ?? "https://kanishkk.xyz",
		items: items.sort(
			(a, b) => (b.pubDate?.valueOf() ?? 0) - (a.pubDate?.valueOf() ?? 0),
		),
		trailingSlash: true,
		customData: "<language>en</language>",
	});
}
