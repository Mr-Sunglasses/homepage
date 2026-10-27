import type { APIContext } from "astro";
import { site } from "@/config";
import { getPositions } from "@/lib/content";
import { feed, positionFeedItem } from "@/lib/feed";

// New and changed positions: an update shows up as a new item.
export async function GET(context: APIContext) {
	const positions = (await getPositions()).filter((p) => !p.isDraft);
	const items = await Promise.all(positions.map(positionFeedItem));
	return feed(
		`${site.name}: positions`,
		"What I believe, and when it changes.",
		items,
		context.site,
	);
}
