// Starts Pagefind's search box on /search/. Kept in a file, not inline, so
// the page's Content-Security-Policy can allow only this site's scripts.
if (window.PagefindUI) {
	new PagefindUI({
		element: "#search",
		showSubResults: true,
		showImages: false,
		autofocus: true,
	});
}
