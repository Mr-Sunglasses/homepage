import type { APIRoute } from "astro";
import styles from "@/styles/global.css?raw";

// The site's stylesheet, for the admin panel's preview pane.
export const GET: APIRoute = () =>
	new Response(styles, {
		headers: { "content-type": "text/css; charset=utf-8" },
	});
