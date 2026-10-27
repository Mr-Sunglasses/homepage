import type { APIContext } from "astro";
import { site } from "@/config";
import { getLinks } from "@/lib/content";
import { feed, linkFeedItem } from "@/lib/feed";

export async function GET(context: APIContext) {
	const links = (await getLinks()).filter((l) => !l.isDraft);
	const items = await Promise.all(links.map(linkFeedItem));
	return feed(
		`${site.name}: links`,
		"Things worth reading, with a line on why.",
		items,
		context.site,
	);
}
