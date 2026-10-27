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
		{ name: "links", label: "Links", label_singular: "Link", ...links("src/content/links") },
		{ name: "trips", label: "Trips", label_singular: "Trip", ...trips("src/content/trips") },
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
		{ name: "draft-links", label: "Drafts: links", label_singular: "Draft link", ...links("drafts/links") },
		{ name: "draft-trips", label: "Drafts: trips", label_singular: "Draft trip", ...trips("drafts/trips") },
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
