import type { APIRoute } from "astro";
import { site } from "@/config";

// WebFinger, so that searching for any @<name>@kanishkk.xyz on the fediverse
// finds the Fosstodon account. Netlify serves this file at
// /.well-known/webfinger (public/_redirects, public/_headers). Moving to
// another fediverse server only means changing `site.fediverse` in
// src/config.ts.
const profile = new URL(site.fediverse.url); // https://fosstodon.org/@name
const user = profile.pathname.replace(/^\/@/, "");
const actor = new URL(`/users/${user}`, profile).href;

export const GET: APIRoute = () =>
	new Response(
		JSON.stringify({
			subject: `acct:${user}@${profile.host}`,
			aliases: [profile.href, actor],
			links: [
				{
					rel: "http://webfinger.net/rel/profile-page",
					type: "text/html",
					href: profile.href,
				},
				{ rel: "self", type: "application/activity+json", href: actor },
				{
					rel: "http://ostatus.org/schema/1.0/subscribe",
					template: `${profile.origin}/authorize_interaction?uri={uri}`,
				},
			],
		}),
	);
