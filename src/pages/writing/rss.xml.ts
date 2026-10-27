import type { APIContext } from "astro";
import { site } from "@/config";
import { getPosts } from "@/lib/content";
import { feed, postFeedItem } from "@/lib/feed";

export async function GET(context: APIContext) {
	const posts = (await getPosts()).filter((p) => !p.isDraft);
	const items = await Promise.all(posts.map(postFeedItem));
	return feed(
		`${site.name}: writing`,
		"Articles, poems and longer thoughts.",
		items,
		context.site,
	);
}
