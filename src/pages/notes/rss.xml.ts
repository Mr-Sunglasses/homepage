import type { APIContext } from "astro";
import { site } from "@/config";
import { getNotes } from "@/lib/content";
import { feed, noteFeedItem } from "@/lib/feed";

export async function GET(context: APIContext) {
	const notes = (await getNotes()).filter((n) => !n.isDraft);
	const items = await Promise.all(notes.map(noteFeedItem));
	return feed(
		`${site.name}: notes`,
		"Short, dated thoughts.",
		items,
		context.site,
	);
}
