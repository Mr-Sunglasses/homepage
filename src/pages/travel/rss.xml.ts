import type { APIContext } from "astro";
import { site } from "@/config";
import { getTrips } from "@/lib/content";
import { feed, tripFeedItem } from "@/lib/feed";

export async function GET(context: APIContext) {
	const trips = (await getTrips()).filter((t) => !t.isDraft);
	const items = await Promise.all(trips.map(tripFeedItem));
	return feed(
		`${site.name}: travel`,
		"Trips around India and the world.",
		items,
		context.site,
	);
}
