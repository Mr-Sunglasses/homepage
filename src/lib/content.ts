import { type CollectionEntry, getCollection } from "astro:content";

type Published = "posts" | "notes" | "links" | "pages";

const draftCollection: Record<Published, string> = {
	posts: "postDrafts",
	notes: "noteDrafts",
	links: "linkDrafts",
	pages: "pageDrafts",
};

export type Entry<C extends Published> = CollectionEntry<C> & {
	isDraft: boolean;
};
export type Post = Entry<"posts">;
export type Note = Entry<"notes">;
export type Link = Entry<"links">;
export type Page = Entry<"pages">;

// Published entries, plus drafts when running `astro dev`.
async function load<C extends Published>(name: C): Promise<Entry<C>[]> {
	const published = (await getCollection(name)) as CollectionEntry<C>[];
	const entries = published.map((e) => ({ ...e, isDraft: false }));
	if (!import.meta.env.DEV) return entries;
	// Draft collections only exist in dev, so they're missing from the
	// generated types; they share the published collection's schema.
	const drafts = (await (getCollection as (n: string) => Promise<unknown[]>)(
		draftCollection[name],
	)) as CollectionEntry<C>[];
	return [...entries, ...drafts.map((e) => ({ ...e, isDraft: true }))];
}

const newestFirst = <T extends { data: { date: Date } }>(a: T, b: T) =>
	b.data.date.valueOf() - a.data.date.valueOf();

export const getPosts = async () => (await load("posts")).sort(newestFirst);
export const getNotes = async () => (await load("notes")).sort(newestFirst);
export const getLinks = async () => (await load("links")).sort(newestFirst);
export const getPages = () => load("pages");

export const kinds = {
	article: { label: "Articles", slug: "articles" },
	poem: { label: "Poems", slug: "poems" },
	thought: { label: "Thoughts", slug: "thoughts" },
} as const;
export type Kind = keyof typeof kinds;

export const postUrl = (post: Post) => `/posts/${post.id}/`;
// Notes are stored as notes/<year>/<date>-<slug>.md; the URL drops the year folder.
export const noteSlug = (note: Note) => note.id.split("/").pop() as string;
export const noteUrl = (note: Note) => `/notes/${noteSlug(note)}/`;
export const linkAnchor = (link: Link) => link.id.split("/").pop() as string;
export const linkUrl = (link: Link) => `/links/#${linkAnchor(link)}`;

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export const isoMonth = (date: Date) => date.toISOString().slice(0, 7);
export const monthName = (date: Date) =>
	date.toLocaleDateString("en-GB", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});

export const domainOf = (url: string) =>
	new URL(url).hostname.replace(/^www\./, "");

export const tagSlug = (tag: string) =>
	tag
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, "-")
		.replace(/[^\p{L}\p{N}-]/gu, "")
		.replace(/-+/g, "-");

export function readingMinutes(body = "") {
	const words = body.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}

// First line of a note's text, for lists where an untitled note needs a label.
export function noteLabel(note: Note, max = 90) {
	if (note.data.title) return note.data.title;
	const text = (note.body ?? "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[*_`>#]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// One shape for every list row on the site.
export type Item = {
	date: Date;
	title: string;
	href: string;
	section: "Writing" | "Notes" | "Links";
	detail?: string;
	tags: string[];
	isDraft: boolean;
	external?: boolean;
};

export const postItem = (post: Post): Item => ({
	date: post.data.date,
	title: post.data.title,
	href: postUrl(post),
	section: "Writing",
	detail: post.data.kind === "article" ? undefined : post.data.kind,
	tags: post.data.tags,
	isDraft: post.isDraft,
});

export const noteItem = (note: Note): Item => ({
	date: note.data.date,
	title: note.data.link
		? `↗ ${note.data.linkTitle ?? note.data.title ?? domainOf(note.data.link)}`
		: noteLabel(note),
	href: noteUrl(note),
	section: "Notes",
	tags: note.data.tags,
	isDraft: note.isDraft,
});

export const linkItem = (link: Link): Item => ({
	date: link.data.date,
	title: link.data.title,
	href: link.data.url,
	section: "Links",
	detail: domainOf(link.data.url),
	tags: link.data.tags,
	isDraft: link.isDraft,
	external: true,
});

export async function getAllItems() {
	const [posts, notes, links] = await Promise.all([
		getPosts(),
		getNotes(),
		getLinks(),
	]);
	return [
		...posts.map(postItem),
		...notes.map(noteItem),
		...links.map(linkItem),
	].sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

export function groupByYear<T>(items: T[], dateOf: (item: T) => Date) {
	const groups = new Map<number, T[]>();
	for (const item of items) {
		const year = dateOf(item).getUTCFullYear();
		groups.set(year, [...(groups.get(year) ?? []), item]);
	}
	return [...groups.entries()];
}
