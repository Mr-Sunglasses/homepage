import { render } from "astro:content";
import rss, { type RSSFeedItem } from "@astrojs/rss";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import sanitizeHtml from "sanitize-html";
import { site } from "@/config";
import {
	confidenceLabels,
	coverOf,
	isoDate,
	type Link,
	type Note,
	noteLabel,
	noteUrl,
	type Position,
	type Post,
	positionUrl,
	postUrl,
	type Til,
	type Trip,
	tilUrl,
	tripDates,
	tripPlaces,
	tripUrl,
} from "@/lib/content";
import { photoFile, widthUpTo } from "@/lib/photos";

let container: AstroContainer | undefined;

// The entry's HTML exactly as the site renders it, with absolute URLs so
// images and links work in feed readers.
async function html(entry: Post | Note | Link | Til | Trip | Position) {
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

export async function positionFeedItem(p: Position): Promise<RSSFeedItem> {
	const { title, summary, confidence, updated, changeMind, history } = p.data;
	const latest = history[0];
	const parts = [
		`<p><strong>My view</strong> (${confidenceLabels[confidence]}): ${escapeHtml(summary)}</p>`,
		latest
			? `<p><strong>What changed (${isoDate(latest.date)}):</strong> ${escapeHtml(latest.change)}</p>`
			: "",
		await html(p),
		changeMind
			? `<p><strong>What would change my mind:</strong> ${escapeHtml(changeMind)}</p>`
			: "",
	];
	return {
		title: history.length > 0 ? `${title} (updated)` : title,
		pubDate: updated,
		description: summary,
		// Keyed by date, so a changed view reaches readers as a new item.
		link: `${positionUrl(p)}#updated-${isoDate(updated)}`,
		categories: p.data.tags,
		content: parts.join(""),
	};
}

export async function tilFeedItem(til: Til): Promise<RSSFeedItem> {
	return {
		title: til.data.title,
		pubDate: til.data.date,
		link: tilUrl(til),
		categories: til.data.tags,
		content: await html(til),
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

const escapeHtml = (text: string) =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

export async function tripFeedItem(trip: Trip): Promise<RSSFeedItem> {
	const cover = coverOf(trip);
	const { photos, summary, title } = trip.data;
	const image = cover
		? `<p><img src="${photoFile(trip, cover, widthUpTo(cover, 1280), "webp")}" alt="${escapeHtml(cover.alt)}" width="${cover.width}" height="${cover.height}"></p>`
		: "";
	const facts = `<p>${escapeHtml([tripDates(trip), tripPlaces(trip)].filter(Boolean).join(" · "))}. <a href="${new URL(tripUrl(trip), site.url).href}">See all ${photos.length} photos</a>.</p>`;
	return {
		title,
		pubDate: trip.data.start,
		description: summary,
		link: tripUrl(trip),
		categories: trip.data.tags,
		content: image + facts + (await html(trip)),
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
