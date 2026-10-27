// Sveltia CMS configuration (https://sveltiacms.app/en/docs).
//
// Written in JavaScript rather than config.yml so the drafts collections can
// reuse the same fields. Drafts are only offered on localhost: online, every
// save is a public commit, and drafts must never leave this machine.

(() => {
	const optional = { required: false };
	const fediverse = {
		name: "fediverse",
		label: "Fosstodon post",
		hint: "The toot that shares this, so readers can reply. Add it after posting.",
		widget: "string",
		...optional,
		pattern: ["^https://", "Paste the full URL of the toot."],
	};
	const tags = {
		name: "tags",
		label: "Tags",
		widget: "list",
		...optional,
		hint: "Comma-separated, e.g. selfhosting, linux",
	};
	const date = { name: "date", label: "Date", widget: "datetime", type: "date" };
	const confidence = {
		name: "confidence",
		label: "How sure am I?",
		widget: "select",
		...optional,
		options: [
			{ label: "Early idea", value: "idea" },
			{ label: "Developing", value: "developing" },
			{ label: "Settled", value: "settled" },
		],
	};
	const markdownBody = (modes) => ({
		name: "body",
		label: "Text",
		widget: "markdown",
		...(modes && { modes }),
	});
	const newestFirst = {
		fields: ["date", "title"],
		default: { field: "date", direction: "descending" },
	};

	// Posts use raw Markdown by default: the rich text editor rewrites
	// Markdown and doesn't know the :::note / ::github directives.
	const postFields = (kinds) => [
		{ name: "title", label: "Title", widget: "string" },
		date,
		{ name: "updated", label: "Updated", widget: "datetime", type: "date", ...optional },
		{ name: "description", label: "Description", widget: "text", ...optional },
		kinds.length > 1
			? { name: "kind", label: "Kind", widget: "select", options: kinds, default: kinds[0].value }
			: { name: "kind", widget: "hidden", default: kinds[0].value },
		tags,
		confidence,
		{ name: "image", label: "Cover image", widget: "image", ...optional },
		fediverse,
		markdownBody(["raw", "rich_text"]),
	];

	const articles = (folder) => ({
		folder,
		path: "{{slug}}",
		media_folder: "assets/images",
		public_folder: "./assets/images",
		sortable_fields: newestFirst,
		summary: "{{title}} · {{date | date('YYYY-MM-DD')}}",
		fields: postFields([
			{ label: "Article", value: "article" },
			{ label: "Thought", value: "thought" },
		]),
	});

	const poems = (folder) => ({
		folder,
		path: "{{slug}}",
		media_folder: "assets/images",
		public_folder: "./assets/images",
		sortable_fields: newestFirst,
		summary: "{{title}} · {{date | date('YYYY-MM-DD')}}",
		fields: postFields([{ label: "Poem", value: "poem" }]),
	});

	// notes/<year>/<date>-<slug>.md, as the site and `pnpm new` expect.
	const byYear = "{{year}}/{{year}}-{{month}}-{{day}}-{{slug}}";
	const uploads = { media_folder: "/public/uploads", public_folder: "/uploads" };

	const notes = (folder) => ({
		folder,
		path: byYear,
		slug: "{{fields.title | default('note')}}",
		...uploads,
		sortable_fields: newestFirst,
		summary: "{{date | date('YYYY-MM-DD')}} · {{title}}{{link}}",
		fields: [
			date,
			{ name: "title", label: "Title", widget: "string", ...optional },
			{
				name: "link",
				label: "Link",
				hint: "If this note is about something you read.",
				widget: "string",
				...optional,
				pattern: ["^https?://", "Paste a full URL."],
			},
			{ name: "linkTitle", label: "Link title", widget: "string", ...optional },
			tags,
			confidence,
			fediverse,
			markdownBody(),
		],
	});

	const links = (folder) => ({
		folder,
		path: byYear,
		slug: "{{title}}",
		...uploads,
		sortable_fields: newestFirst,
		summary: "{{date | date('YYYY-MM-DD')}} · {{title}}",
		fields: [
			date,
			{ name: "url", label: "URL", widget: "string", pattern: ["^https?://", "Paste a full URL."] },
			{ name: "title", label: "Title", widget: "string" },
			{ name: "via", label: "Found via", widget: "string", ...optional },
			tags,
			fediverse,
			markdownBody(),
		],
	});

	// TILs keep the slug from their title: /tils/<slug>/.
	const tils = (folder) => ({
		folder,
		path: "{{slug}}",
		slug: "{{title}}",
		...uploads,
		sortable_fields: newestFirst,
		summary: "{{date | date('YYYY-MM-DD')}} · {{title}}",
		fields: [
			{ name: "title", label: "Title", widget: "string" },
			date,
			{ ...tags, label: "Topics", hint: "Comma-separated, e.g. git, bash" },
			fediverse,
			markdownBody(["raw", "rich_text"]),
		],
	});

	const byTitle = (field = "title") => ({
		fields: [field],
		default: { field, direction: "ascending" },
	});
	const plain = (folder, extra) => ({ folder, path: "{{slug}}", ...uploads, ...extra });

	// Positions are living pages: update `updated` and add a history line
	// whenever the view changes.
	const positions = (folder) =>
		plain(folder, {
			slug: "{{title}}",
			sortable_fields: byTitle(),
			summary: "{{title}} · {{confidence}} · {{updated | date('YYYY-MM-DD')}}",
			fields: [
				{ name: "title", label: "Title", widget: "string" },
				{ name: "summary", label: "My view, in a sentence or two", widget: "text" },
				{ ...confidence, required: true, default: "developing" },
				{ name: "updated", label: "Last changed", widget: "datetime", type: "date" },
				{ name: "reviewed", label: "Last reviewed", widget: "datetime", type: "date", ...optional },
				{ name: "changeMind", label: "What would change my mind", widget: "text", ...optional },
				tags,
				{
					name: "history",
					label: "How this view has changed",
					hint: "Newest first.",
					widget: "list",
					...optional,
					summary: "{{date | date('YYYY-MM-DD')}}: {{change}}",
					fields: [
						{ name: "date", label: "Date", widget: "datetime", type: "date" },
						{ name: "change", label: "What changed and why", widget: "text" },
					],
				},
				fediverse,
				{ ...markdownBody(["raw", "rich_text"]), label: "Reasoning and sources" },
			],
		});

	const topics = (folder) =>
		plain(folder, {
			slug: "{{title}}",
			sortable_fields: byTitle(),
			summary: "{{title}}",
			fields: [
				{ name: "title", label: "Title", widget: "string" },
				{ name: "summary", label: "One-line introduction", widget: "text" },
				{ ...tags, required: true, hint: "Everything with any of these tags appears on the topic page." },
				{ name: "position", label: "Position (its file name)", widget: "string", ...optional },
				{ name: "order", label: "Order", widget: "number", default: 100, ...optional },
				{ ...markdownBody(["raw", "rich_text"]), label: "Introduction: start here" },
			],
		});

	const projects = (folder) =>
		plain(folder, {
			slug: "{{title}}",
			sortable_fields: byTitle(),
			summary: "{{title}} · {{status}}",
			fields: [
				{ name: "title", label: "Name", widget: "string" },
				{ name: "summary", label: "What it is, in a sentence", widget: "text" },
				{ name: "role", label: "My role", widget: "string", ...optional },
				{
					name: "status",
					label: "Status",
					widget: "select",
					options: [
						{ label: "Active", value: "active" },
						{ label: "Maintained", value: "maintained" },
						{ label: "Past", value: "past" },
					],
				},
				{ name: "start", label: "Started", widget: "datetime", type: "date" },
				{ name: "end", label: "Ended", widget: "datetime", type: "date", ...optional },
				{ name: "url", label: "Website", widget: "string", ...optional },
				{ name: "repo", label: "Code", widget: "string", ...optional },
				tags,
				{ ...markdownBody(["raw", "rich_text"]), label: "The story" },
			],
		});

	const talks = (folder) =>
		plain(folder, {
			slug: "{{year}}-{{title}}",
			sortable_fields: newestFirst,
			summary: "{{date | date('YYYY-MM-DD')}} · {{event}} · {{title}}",
			fields: [
				{ name: "title", label: "Title", widget: "string" },
				{ name: "event", label: "Event", widget: "string" },
				date,
				{ name: "place", label: "Place", widget: "string", ...optional },
				{ name: "url", label: "Event page", widget: "string", ...optional },
				{ name: "slides", label: "Slides", widget: "string", ...optional },
				{ name: "video", label: "Video", widget: "string", ...optional },
				tags,
				{ ...markdownBody(), label: "About the talk" },
			],
		});

	const books = (folder) =>
		plain(folder, {
			slug: "{{title}}",
			sortable_fields: byTitle(),
			summary: "{{title}} · {{author}} · {{status}}",
			fields: [
				{ name: "title", label: "Title", widget: "string" },
				{ name: "author", label: "Author", widget: "string" },
				{
					name: "status",
					label: "Status",
					widget: "select",
					options: [
						{ label: "Reading now", value: "reading" },
						{ label: "Read", value: "read" },
						{ label: "Want to read", value: "want" },
						{ label: "Stopped reading", value: "abandoned" },
					],
				},
				{ name: "started", label: "Started", widget: "datetime", type: "date", ...optional },
				{ name: "finished", label: "Finished", widget: "datetime", type: "date", ...optional },
				{ name: "rating", label: "Rating (1–5)", widget: "number", min: 1, max: 5, ...optional },
				{ name: "url", label: "Link to the book", widget: "string", ...optional },
				tags,
				{ ...markdownBody(), label: "My notes", ...optional },
			],
		});

	const quotes = (folder) =>
		plain(folder, {
			slug: "{{author}}-{{year}}{{month}}{{day}}",
			sortable_fields: newestFirst,
			summary: "{{author}} · {{date | date('YYYY-MM-DD')}}",
			fields: [
				{ ...markdownBody(), label: "The quote" },
				{ name: "author", label: "Who said it", widget: "string" },
				{ name: "source", label: "Where (book, talk, page)", widget: "string", ...optional },
				{ name: "url", label: "Source link", widget: "string", ...optional },
				{ ...date, label: "Added" },
				tags,
			],
		});

	const avoid = (folder) =>
		plain(folder, {
			slug: "{{name}}",
			sortable_fields: byTitle("name"),
			summary: "{{name}} → {{instead}}",
			fields: [
				{ name: "name", label: "What I avoid", widget: "string" },
				{ name: "instead", label: "What I use instead", widget: "string" },
				{ name: "category", label: "Category", widget: "string", hint: "e.g. Messaging, Search, Hosting" },
				{ name: "url", label: "Link to the alternative", widget: "string", ...optional },
				{ name: "since", label: "Since", widget: "datetime", type: "date", ...optional },
				{ ...markdownBody(), label: "Why" },
			],
		});

	const glossary = (folder) =>
		plain(folder, {
			slug: "{{term}}",
			sortable_fields: byTitle("term"),
			summary: "{{term}}",
			fields: [
				{ name: "term", label: "Term", widget: "string" },
				{ name: "seeAlso", label: "See also (term file names)", widget: "list", ...optional },
				tags,
				{ ...markdownBody(), label: "What I mean by it" },
			],
		});

	// Photos are added by `pnpm photos:import`; here you write the words.
	// Everything the import computed is read-only.
	const readonly = (field) => ({ ...field, readonly: true, ...optional });
	const trips = (folder) => ({
		folder,
		path: "{{slug}}/index",
		slug: "{{fields.start | date('YYYY-MM')}}-{{title}}",
		media_folder: "",
		public_folder: "",
		sortable_fields: {
			fields: ["start", "title"],
			default: { field: "start", direction: "descending" },
		},
		summary: "{{title}} · {{start | date('MMM YYYY')}}",
		fields: [
			{ name: "title", label: "Title", widget: "string" },
			{ name: "start", label: "Start", widget: "datetime", type: "date" },
			{ name: "end", label: "End", widget: "datetime", type: "date", ...optional },
			{
				name: "region",
				label: "Region",
				widget: "select",
				options: [
					{ label: "India", value: "india" },
					{ label: "Around the world", value: "world" },
				],
			},
			{ name: "summary", label: "Summary", widget: "text", ...optional },
			{
				name: "places",
				label: "Places",
				hint: "City-level only. They are the dots on the map.",
				widget: "list",
				...optional,
				summary: "{{name}}, {{country}}",
				fields: [
					{ name: "name", label: "Place", widget: "string" },
					{ name: "country", label: "Country", widget: "string", default: "India" },
					{ name: "lat", label: "Latitude", widget: "number", value_type: "float" },
					{ name: "lng", label: "Longitude", widget: "number", value_type: "float" },
				],
			},
			{
				name: "cover",
				label: "Cover photo",
				hint: "The id of one of the photos below.",
				widget: "string",
				...optional,
			},
			tags,
			fediverse,
			{
				name: "photos",
				label: "Photos",
				hint: "Add photos with `pnpm photos:import`. Every photo needs alt text before the trip is published.",
				widget: "list",
				...optional,
				allow_add: false,
				collapsed: true,
				summary: "{{alt}} ({{id}})",
				fields: [
					{
						name: "alt",
						label: "Alt text",
						hint: "What the photo shows, for people who can't see it.",
						widget: "string",
						...optional,
					},
					{ name: "caption", label: "Caption", widget: "text", ...optional },
					{ name: "place", label: "Place", widget: "string", ...optional },
					readonly({ name: "id", label: "Id", widget: "string" }),
					readonly({ name: "takenAt", label: "Taken", widget: "string" }),
					readonly({ name: "ext", label: "Original format", widget: "string" }),
					readonly({ name: "width", label: "Width", widget: "number" }),
					readonly({ name: "height", label: "Height", widget: "number" }),
					readonly({ name: "widths", label: "Sizes", widget: "list", field: { name: "w", widget: "number" } }),
					readonly({ name: "sha256", label: "Checksum", widget: "string" }),
					readonly({ name: "color", label: "Colour", widget: "string" }),
				],
			},
			markdownBody(["raw", "rich_text"]),
		],
	});

	const page = (name, label, folder) => ({
		name,
		label,
		file: `${folder}/${name}.md`,
		fields: [
			{ name: "title", label: "Title", widget: "string" },
			{ name: "description", label: "Description", widget: "text", ...optional },
			{ name: "updated", label: "Updated", widget: "datetime", type: "date", ...optional },
			markdownBody(["raw", "rich_text"]),
		],
	});

	const published = [
		{ name: "articles", label: "Articles", label_singular: "Article", ...articles("src/content/posts") },
		{ name: "poems", label: "Poems", label_singular: "Poem", ...poems("src/content/posts/poems") },
		{ name: "notes", label: "Notes", label_singular: "Note", ...notes("src/content/notes") },
		{ name: "tils", label: "TILs", label_singular: "TIL", ...tils("src/content/tils") },
		{ name: "links", label: "Links", label_singular: "Link", ...links("src/content/links") },
		{ name: "trips", label: "Trips", label_singular: "Trip", ...trips("src/content/trips") },
		{ name: "positions", label: "Positions", label_singular: "Position", ...positions("src/content/positions") },
		{ name: "topics", label: "Topics", label_singular: "Topic", ...topics("src/content/topics") },
		{ name: "projects", label: "Projects", label_singular: "Project", ...projects("src/content/projects") },
		{ name: "talks", label: "Talks", label_singular: "Talk", ...talks("src/content/talks") },
		{ name: "books", label: "Books", label_singular: "Book", ...books("src/content/books") },
		{ name: "quotes", label: "Quotes", label_singular: "Quote", ...quotes("src/content/quotes") },
		{ name: "avoid", label: "Things I avoid", label_singular: "Thing I avoid", ...avoid("src/content/avoid") },
		{ name: "glossary", label: "Glossary", label_singular: "Term", ...glossary("src/content/glossary") },
		{
			name: "pages",
			label: "Pages",
			files: [
				page("about", "About", "src/content/pages"),
				page("contact", "Contact", "src/content/pages"),
			],
		},
	];

	// Same collections, pointing at drafts/. Only used on localhost.
	const drafts = [
		{ name: "draft-articles", label: "Drafts: articles", label_singular: "Draft article", ...articles("drafts/posts") },
		{ name: "draft-poems", label: "Drafts: poems", label_singular: "Draft poem", ...poems("drafts/posts/poems") },
		{ name: "draft-notes", label: "Drafts: notes", label_singular: "Draft note", ...notes("drafts/notes") },
		{ name: "draft-tils", label: "Drafts: TILs", label_singular: "Draft TIL", ...tils("drafts/tils") },
		{ name: "draft-links", label: "Drafts: links", label_singular: "Draft link", ...links("drafts/links") },
		{ name: "draft-trips", label: "Drafts: trips", label_singular: "Draft trip", ...trips("drafts/trips") },
		{ name: "draft-positions", label: "Drafts: positions", label_singular: "Draft position", ...positions("drafts/positions") },
		{ name: "draft-topics", label: "Drafts: topics", label_singular: "Draft topic", ...topics("drafts/topics") },
		{ name: "draft-projects", label: "Drafts: projects", label_singular: "Draft project", ...projects("drafts/projects") },
		{ name: "draft-talks", label: "Drafts: talks", label_singular: "Draft talk", ...talks("drafts/talks") },
		{ name: "draft-books", label: "Drafts: books", label_singular: "Draft book", ...books("drafts/books") },
		{ name: "draft-quotes", label: "Drafts: quotes", label_singular: "Draft quote", ...quotes("drafts/quotes") },
		{ name: "draft-avoid", label: "Drafts: things I avoid", label_singular: "Draft", ...avoid("drafts/avoid") },
		{ name: "draft-glossary", label: "Drafts: glossary", label_singular: "Draft term", ...glossary("drafts/glossary") },
		{
			name: "draft-pages",
			label: "Drafts: pages",
			files: [page("now", "Now", "drafts/pages"), page("uses", "Uses", "drafts/pages")],
		},
	];

	const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);

	window.SITE_CMS_CONFIG = {
		load_config_file: false,
		backend: {
			name: "github",
			repo: "Mr-Sunglasses/homepage",
			branch: "main",
		},
		site_url: "https://kanishkk.xyz",
		display_url: "https://kanishkk.xyz",
		media_folder: "public/uploads",
		public_folder: "/uploads",
		output: { omit_empty_optional_fields: true },
		media_libraries: {
			all: {
				transformations: {
					raster_image: { format: "webp", quality: 85, width: 2048, height: 2048 },
				},
			},
		},
		collections: local ? [...drafts, ...published] : published,
	};
})();
