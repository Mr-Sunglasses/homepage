import {
	bookUrl,
	getAvoid,
	getBooks,
	getGlossary,
	getPages,
	getPositions,
	getProjects,
	getQuotes,
	getTalks,
	getTopics,
} from "@/lib/content";

export type HubLink = { href: string; title: string };
// `links` are named after the detail, e.g. the books I'm reading now.
export type HubSection = {
	href: string;
	label: string;
	detail: string;
	links?: HubLink[];
};

const count = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

// Everything about me beyond the posts: shown on the homepage and on About.
// Only sections with something in them. Contact and the résumé aren't here:
// the footer links them on every page. `exclude` drops sections the page
// already shows in full (the homepage has its own Now and Positions blocks).
export async function hubSections(
	exclude: string[] = [],
): Promise<HubSection[]> {
	const [
		pages,
		projects,
		talks,
		books,
		quotes,
		avoid,
		glossary,
		topics,
		positions,
	] = await Promise.all([
		getPages(),
		getProjects(),
		getTalks(),
		getBooks(),
		getQuotes(),
		getAvoid(),
		getGlossary(),
		getTopics(),
		getPositions(),
	]);
	const reading = books.filter((b) => b.data.status === "reading");
	const hasPage = (id: string) =>
		pages.some((page) => page.id === id && page.body?.trim());
	return [
		hasPage("now") && {
			href: "/now/",
			label: "Now",
			detail: "what I'm doing these days",
		},
		positions.length > 0 && {
			href: "/positions/",
			label: "Positions",
			detail: count(positions.length, "view", "views"),
		},
		topics.length > 0 && {
			href: "/topics/",
			label: "Topics",
			detail: "the themes I write about",
		},
		projects.length > 0 && {
			href: "/projects/",
			label: "Projects",
			detail: count(projects.length, "project", "projects"),
		},
		talks.length > 0 && {
			href: "/talks/",
			label: "Talks",
			detail: count(talks.length, "talk", "talks"),
		},
		books.length > 0 && {
			href: "/books/",
			label: "Books",
			// What I'm reading now, by name; the count only when there's more.
			detail:
				reading.length === 0
					? count(books.length, "book", "books")
					: reading.length === books.length
						? "reading"
						: `${count(books.length, "book", "books")}, reading`,
			links: reading.map((b) => ({ href: bookUrl(b), title: b.data.title })),
		},
		quotes.length > 0 && {
			href: "/quotes/",
			label: "Quotes",
			detail: count(quotes.length, "quote", "quotes"),
		},
		avoid.length > 0 && {
			href: "/avoid/",
			label: "Things I avoid",
			detail: "and what I use instead",
		},
		glossary.length > 0 && {
			href: "/glossary/",
			label: "Glossary",
			detail: count(glossary.length, "term", "terms"),
		},
		hasPage("uses") && {
			href: "/uses/",
			label: "Uses",
			detail: "the tools I use",
		},
	]
		.filter((s): s is HubSection => Boolean(s))
		.filter((s) => !exclude.includes(s.href));
}
