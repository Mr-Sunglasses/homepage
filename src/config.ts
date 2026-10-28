export const site = {
	// The site's name, in the header. Page titles, feeds and search results
	// use `name`, so people searching for me still find the site.
	title: "Mr. Sunglasses",
	name: "Kanishk Pachauri",
	url: "https://kanishkk.xyz",
	description:
		"Pythonista, open-source contributor and Linux enthusiast. Writing about software freedom and self-hosting, notes, links worth reading, and travel photos.",
	intro:
		"Pythonista, open-source contributor and Linux enthusiast from India. I write about software freedom, self-hosting and whatever I'm curious about, and I travel around India and the world.",
	lang: "en",
	license: {
		name: "CC BY-NC-SA 4.0",
		url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
	},
	source: "https://github.com/Mr-Sunglasses/homepage",
	fediverse: {
		handle: "@itskanishkp@fosstodon.org",
		url: "https://fosstodon.org/@itskanishkp",
	},
};

// Same order on every page.
export const nav = [
	{ label: "Home", href: "/" },
	{ label: "Writing", href: "/writing/" },
	{ label: "Notes", href: "/notes/" },
	{ label: "TILs", href: "/tils/" },
	{ label: "Links", href: "/links/" },
	{ label: "Positions", href: "/positions/" },
	{ label: "Travel", href: "/travel/" },
	{ label: "About", href: "/about/" },
	{ label: "Search", href: "/search/" },
];

// `me`: profiles that are me (rel="me"), so each can verify the other.
export const elsewhere = [
	{ label: "GitHub", href: "https://github.com/Mr-Sunglasses", me: true },
	{ label: "Fosstodon", href: "https://fosstodon.org/@itskanishkp", me: true },
	{ label: "X", href: "https://x.com/itskanishkp", me: true },
	{ label: "RSS", href: "/rss.xml" },
	{ label: "Contact & GPG", href: "/contact/" },
	{ label: "Résumé", href: "/resume.pdf" },
];
