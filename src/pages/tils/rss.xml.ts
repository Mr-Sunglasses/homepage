import type { APIContext } from "astro";
import { site } from "@/config";
import { getTils } from "@/lib/content";
import { feed, tilFeedItem } from "@/lib/feed";

// tils.kanishkk.xyz/feed.rss redirects here.
export async function GET(context: APIContext) {
	const tils = (await getTils()).filter((t) => !t.isDraft);
	const items = await Promise.all(tils.map(tilFeedItem));
	return feed(
		`${site.name}: TILs`,
		"Today I Learned: small things I picked up.",
		items,
		context.site,
	);
}
