import { type CollectionEntry, getCollection } from "astro:content";

type Published =
	| "posts"
	| "notes"
	| "links"
	| "tils"
	| "pages"
	| "trips"
	| "positions"
	| "topics"
	| "projects"
	| "talks"
	| "books"
	| "quotes"
	| "avoid"
	| "glossary";

const draftCollection: Record<Published, string> = {
	posts: "postDrafts",
	notes: "noteDrafts",
	links: "linkDrafts",
	tils: "tilDrafts",
	pages: "pageDrafts",
	trips: "tripDrafts",
	positions: "positionDrafts",
	topics: "topicDrafts",
	projects: "projectDrafts",
	talks: "talkDrafts",
	books: "bookDrafts",
	quotes: "quoteDrafts",
	avoid: "avoidDrafts",
	glossary: "glossaryDrafts",
};

export type Entry<C extends Published> = CollectionEntry<C> & {
	isDraft: boolean;
};
export type Post = Entry<"posts">;
export type Note = Entry<"notes">;
export type Link = Entry<"links">;
export type Til = Entry<"tils">;
export type Page = Entry<"pages">;
export type Trip = Entry<"trips">;
export type Photo = Trip["data"]["photos"][number];
export type Position = Entry<"positions">;
export type Topic = Entry<"topics">;
export type Project = Entry<"projects">;
export type Talk = Entry<"talks">;
export type Book = Entry<"books">;
export type Quote = Entry<"quotes">;
export type Avoid = Entry<"avoid">;
export type Term = Entry<"glossary">;

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
export const getTils = async () => (await load("tils")).sort(newestFirst);
export const getPages = () => load("pages");
export const getPositions = async () =>
	(await load("positions")).sort(
		(a, b) => b.data.updated.valueOf() - a.data.updated.valueOf(),
	);
export const getTopics = async () =>
	(await load("topics")).sort(
		(a, b) =>
			a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
	);
export const getProjects = async () =>
	(await load("projects")).sort(
		(a, b) => b.data.start.valueOf() - a.data.start.valueOf(),
	);
export const getTalks = async () => (await load("talks")).sort(newestFirst);
export const getBooks = async () =>
	(await load("books")).sort(
		(a, b) => (bookDate(b)?.valueOf() ?? 0) - (bookDate(a)?.valueOf() ?? 0),
	);
export const getQuotes = async () => (await load("quotes")).sort(newestFirst);
export const getAvoid = async () =>
	(await load("avoid")).sort((a, b) => a.data.name.localeCompare(b.data.name));
export const getGlossary = async () =>
	(await load("glossary")).sort((a, b) =>
		a.data.term.localeCompare(b.data.term),
	);

export const bookDate = (book: Book) => book.data.finished ?? book.data.started;

export const getTrips = async () =>
	(await load("trips")).sort(
		(a, b) => b.data.start.valueOf() - a.data.start.valueOf(),
	);

export const kinds = {
	article: { label: "Articles", slug: "articles" },
	poem: { label: "Poems", slug: "poems" },
	thought: { label: "Thoughts", slug: "thoughts" },
} as const;
export type Kind = keyof typeof kinds;

// Long lists are split into pages of this size.
export const PAGE_SIZE = 20;

export const postUrl = (post: Post) => `/posts/${post.id}/`;
// Notes are stored as notes/<year>/<date>-<slug>.md; the URL drops the year folder.
export const noteSlug = (note: Note) => note.id.split("/").pop() as string;
export const noteUrl = (note: Note) => `/notes/${noteSlug(note)}/`;
export const linkAnchor = (link: Link) => link.id.split("/").pop() as string;
export const linkUrl = (link: Link) => `/links/#${linkAnchor(link)}`;
// Same slugs as on tils.kanishkk.xyz/post/<slug>, so old links redirect 1:1.
export const tilUrl = (til: Til) => `/tils/${til.id}/`;
export const tilTopicUrl = (tag: string) => `/tils/topics/${tagSlug(tag)}/`;
export const positionUrl = (p: Position) => `/positions/${p.id}/`;
export const topicUrl = (t: Topic) => `/topics/${t.id}/`;
export const projectUrl = (p: Project) => `/projects/${p.id}/`;
export const talkUrl = (t: Talk) => `/talks/#${t.id}`;
export const bookUrl = (b: Book) => `/books/${b.id}/`;
export const quoteUrl = (q: Quote) => `/quotes/#${q.id}`;
export const termUrl = (t: Term) => `/glossary/#${t.id}`;

export const confidenceLabels = {
	idea: "early idea",
	developing: "developing",
	settled: "settled",
} as const;
// Trips are stored as trips/<slug>/index.md.
export const tripSlug = (trip: Trip) => trip.id.replace(/\/index$/, "");
export const tripUrl = (trip: Trip) => `/travel/${tripSlug(trip)}/`;
export const photoUrl = (trip: Trip, photo: Photo) =>
	`${tripUrl(trip)}${photo.id}/`;

const MONTH = { month: "short", timeZone: "UTC" } as const;
const MONTH_YEAR = {
	month: "short",
	year: "numeric",
	timeZone: "UTC",
} as const;
/** "Oct 2026", or "Sep – Oct 2026" / "Dec 2025 – Jan 2026" across months. */
export function tripDates(trip: Trip) {
	const { start, end } = trip.data;
	const last = end ?? start;
	if (isoMonth(start) === isoMonth(last)) {
		return start.toLocaleDateString("en-GB", MONTH_YEAR);
	}
	const sameYear = start.getUTCFullYear() === last.getUTCFullYear();
	return `${start.toLocaleDateString("en-GB", sameYear ? MONTH : MONTH_YEAR)} – ${last.toLocaleDateString("en-GB", MONTH_YEAR)}`;
}

export const tripCountries = (trip: Trip) =>
	[...new Set(trip.data.places.map((p) => p.country))].join(", ") ||
	(trip.data.region === "india" ? "India" : "");

/** The places of a trip as a short line: "McLeod Ganj, Dharamshala · India". */
export function tripPlaces(trip: Trip) {
	const names = trip.data.places.map((p) => p.name).join(", ");
	return [names, tripCountries(trip)].filter(Boolean).join(" · ");
}

export const coverOf = (trip: Trip) =>
	trip.data.photos.find((p) => p.id === trip.data.cover) ?? trip.data.photos[0];

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
	// What kind of thing it is, shown on mixed lists (archive, tags).
	label:
		| Kind
		| "note"
		| "link"
		| "til"
		| "trip"
		| "position"
		| "project"
		| "talk"
		| "book";
	detail?: string;
	tags: string[];
	isDraft: boolean;
	external?: boolean;
};

export const postItem = (post: Post): Item => ({
	date: post.data.date,
	title: post.data.title,
	href: postUrl(post),
	label: post.data.kind,
	tags: post.data.tags,
	isDraft: post.isDraft,
});

export const noteItem = (note: Note): Item => ({
	date: note.data.date,
	title: note.data.link
		? `↗ ${note.data.linkTitle ?? note.data.title ?? domainOf(note.data.link)}`
		: noteLabel(note),
	href: noteUrl(note),
	label: "note",
	tags: note.data.tags,
	isDraft: note.isDraft,
});

export const linkItem = (link: Link): Item => ({
	date: link.data.date,
	title: link.data.title,
	href: link.data.url,
	label: "link",
	detail: domainOf(link.data.url),
	tags: link.data.tags,
	isDraft: link.isDraft,
	external: true,
});

export const tilItem = (til: Til): Item => ({
	date: til.data.date,
	title: til.data.title,
	href: tilUrl(til),
	label: "til",
	tags: til.data.tags,
	isDraft: til.isDraft,
});

export const tripItem = (trip: Trip): Item => ({
	date: trip.data.start,
	title: trip.data.title,
	href: tripUrl(trip),
	label: "trip",
	detail: [
		tripCountries(trip),
		trip.data.photos.length > 0
			? `${trip.data.photos.length} photo${trip.data.photos.length === 1 ? "" : "s"}`
			: null,
	]
		.filter(Boolean)
		.join(" · "),
	tags: trip.data.tags,
	isDraft: trip.isDraft,
});

export const positionItem = (p: Position): Item => ({
	date: p.data.updated,
	title: p.data.title,
	href: positionUrl(p),
	label: "position",
	detail: confidenceLabels[p.data.confidence],
	tags: p.data.tags,
	isDraft: p.isDraft,
});

export const projectItem = (p: Project): Item => ({
	date: p.data.start,
	title: p.data.title,
	href: projectUrl(p),
	label: "project",
	detail: p.data.role,
	tags: p.data.tags,
	isDraft: p.isDraft,
});

export const talkItem = (t: Talk): Item => ({
	date: t.data.date,
	title: t.data.title,
	href: talkUrl(t),
	label: "talk",
	detail: t.data.event,
	tags: t.data.tags,
	isDraft: t.isDraft,
});

// Books appear in dated lists only once started or finished.
export const bookItem = (b: Book): Item | null => {
	const date = bookDate(b);
	return date
		? {
				date,
				title: b.data.title,
				href: bookUrl(b),
				label: "book",
				detail: b.data.author,
				tags: b.data.tags,
				isDraft: b.isDraft,
			}
		: null;
};

export async function getAllItems() {
	const [posts, notes, links, tils, trips, positions, projects, talks, books] =
		await Promise.all([
			getPosts(),
			getNotes(),
			getLinks(),
			getTils(),
			getTrips(),
			getPositions(),
			getProjects(),
			getTalks(),
			getBooks(),
		]);
	return [
		...posts.map(postItem),
		...notes.map(noteItem),
		...links.map(linkItem),
		...tils.map(tilItem),
		...trips.map(tripItem),
		...positions.map(positionItem),
		...projects.map(projectItem),
		...talks.map(talkItem),
		...books.map(bookItem).filter((item): item is Item => item !== null),
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
