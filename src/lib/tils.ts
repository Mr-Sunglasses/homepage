import type { Page } from "astro";
import { getTils, PAGE_SIZE, type Til, tagSlug } from "@/lib/content";

// TIL topics (their tags), with counts, alphabetically.
export function topicsOf(tils: Til[]) {
	const topics = new Map<string, { name: string; count: number }>();
	for (const tag of tils.flatMap((til) => til.data.tags)) {
		const slug = tagSlug(tag);
		const topic = topics.get(slug) ?? { name: tag, count: 0 };
		topics.set(slug, { ...topic, count: topic.count + 1 });
	}
	return [...topics.entries()]
		.map(([slug, topic]) => ({ slug, ...topic }))
		.sort((a, b) => a.slug.localeCompare(b.slug));
}

// /tils/ is page 1, then /tils/page/2/, … (a [...page] route at /tils/
// would collide with /tils/<slug>/).
const pageUrl = (n: number) => (n === 1 ? "/tils/" : `/tils/page/${n}/`);

export async function tilPages() {
	const tils = await getTils();
	const lastPage = Math.max(1, Math.ceil(tils.length / PAGE_SIZE));
	return Array.from({ length: lastPage }, (_, i) => {
		const n = i + 1;
		return {
			tils: tils.slice(i * PAGE_SIZE, n * PAGE_SIZE),
			all: tils,
			// The parts of Astro's Page that <Pager> uses.
			page: {
				currentPage: n,
				lastPage,
				url: {
					prev: n > 1 ? pageUrl(n - 1) : undefined,
					next: n < lastPage ? pageUrl(n + 1) : undefined,
				},
			} as Page<unknown>,
		};
	});
}
