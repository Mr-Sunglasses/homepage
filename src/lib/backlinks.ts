import { buildIndex, outgoing } from "@/lib/wiki.mjs";

type Source = { url: string; title: string; collection: string };

let cache: Map<string, Source[]> | undefined;

// For every page, the pages that link to it: built once per build from the
// same index the [[wiki link]] plugin uses. In dev it's rebuilt each time so
// new links show up without a restart.
export function mentionsOf(url: string): Source[] {
	if (!cache || import.meta.env.DEV) {
		const index = buildIndex({ includeDrafts: import.meta.env.DEV });
		cache = new Map();
		for (const entry of index) {
			for (const target of outgoing(index, entry)) {
				const list = cache.get(target) ?? [];
				list.push({
					url: entry.url,
					title: entry.title,
					collection: entry.collection,
				});
				cache.set(target, list);
			}
		}
	}
	return (cache.get(url) ?? []).sort((a, b) => a.title.localeCompare(b.title));
}
