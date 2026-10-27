import type { APIContext } from "astro";
import { site } from "@/config";
import { getLinks, getNotes, getPosts } from "@/lib/content";
import { feed, linkFeedItem, noteFeedItem, postFeedItem } from "@/lib/feed";

// Everything on the site in one feed. The section feeds are separate files.
export async function GET(context: APIContext) {
	const [posts, notes, links] = await Promise.all([
		getPosts(),
		getNotes(),
		getLinks(),
	]);
	const items = await Promise.all([
		...posts.filter((p) => !p.isDraft).map(postFeedItem),
		...notes.filter((n) => !n.isDraft).map(noteFeedItem),
		...links.filter((l) => !l.isDraft).map(linkFeedItem),
	]);
	return feed(site.name, site.description, items, context.site);
}
