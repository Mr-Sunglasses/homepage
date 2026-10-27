# kanishkk.xyz

My personal website: writing, notes, links worth reading, and travel photos.
Plain HTML, no JavaScript, no tracking. Built with [Astro](https://astro.build).

## Working on it

```sh
pnpm install     # also installs the pre-commit hook
pnpm dev         # http://localhost:4321, drafts included
pnpm build       # production build in dist/, drafts never included
pnpm test        # unit tests for the Markdown plugins and scripts
pnpm check       # type check
pnpm lint        # format and lint with Biome
```

## Writing

Unfinished work lives in `drafts/`, which is gitignored and never leaves this
machine. `pnpm dev` shows drafts at their real URLs with a red DRAFT bar and
lists them all at `/drafts/`.

```sh
pnpm new post "Title" [--kind article|poem|thought]
pnpm new note ["Title"] [--link https://…]
pnpm new link https://… "Title"
pnpm new page now
pnpm new trip "Ladakh" --start 2026-10-02 [--end 2026-10-12] --region india|world

pnpm promote drafts/posts/title.md   # move into src/content/, date it today
```

Three guards keep drafts private:

- `.gitignore` excludes `drafts/`.
- The pre-commit hook (`.githooks/pre-commit`) refuses anything under
  `drafts/` and any file with a `draft:` key.
- Content schemas are strict, so a `draft:` key fails the build; CI also
  re-runs the drafts check on every push.

## Admin panel

A [Sveltia CMS](https://sveltiacms.app) editor at `/admin/`. It's the only page
that uses JavaScript, and it edits the same Markdown files.

- **At your desk (drafts included):** run `pnpm dev`, open
  `http://localhost:4321/admin/index.html` in Chrome, Edge or Brave, click
  "Work with Local Repository" and choose this folder. Saves go straight to
  the files; the site in the next tab updates as you type. Commit with git.
- **Anywhere else:** open `https://kanishkk.xyz/admin/` and use "Sign In Using
  Access Token" with a fine-grained GitHub token for this repository only
  (Contents: read and write). Every save is a commit that deploys, so drafts
  aren't offered there: notes, links, captions and pages only.

Posts open in raw Markdown, because the rich text editor rewrites Markdown
and doesn't know the `:::note` callouts.

## Travel photos

Photos never go in git. `pnpm photos:import` makes web sizes (AVIF and WebP,
640/1280/2048 px), strips all metadata (GPS, camera serials, names), and
uploads them and the untouched originals to **every** store in `.env`
(Cloudflare R2 and Garage on the VPS). Then it adds them to the trip.

```sh
pnpm new trip "Ladakh" --start 2026-10-02 --region india   # then add places
pnpm photos:import ~/Pictures/ladakh --trip 2026-10-ladakh  # safe to re-run
pnpm photos:verify            # both stores complete and identical?
pnpm photos:verify --repair   # copy anything missing from the other store
```

Photos get their place from GPS (the nearest of the trip's places within
60 km); the coordinates themselves are never stored. Write alt text for each
photo in the admin panel or the trip file: the build fails on a published
photo without it. HEIC photos are converted with `sips` on macOS.

To try all of this without touching the real stores, run two local Garage
stores (needs Podman or Docker):

```sh
pnpm stores:dev up                                        # or: down, reset
pnpm photos:dev:import ~/Pictures/test --trip 2026-10-ladakh
pnpm photos:dev:verify
pnpm dev                                                  # photos load from the local store
```

## Checks

The pre-commit hook and CI refuse drafts and images with private metadata.
CI also runs lint, unit tests, the type check, a build, and
`scripts/check-built.mjs`: no JavaScript on any page, alt text on every image,
and a homepage under 30 KB.

## Layout

```
src/content/posts/   articles, poems/ (URLs: /posts/<slug>/, unchanged from the old blog)
src/content/notes/   short notes, by year
src/content/links/   recommended links, by year
src/content/pages/   about, contact, now, uses
src/content/trips/   one folder per trip: index.md with the story and photo list
src/plugins/         Markdown plugins (callouts, iframes → links, title headings)
scripts/             new, promote, photos-import/verify, checks, local stores
public/admin/        the admin panel
public/_redirects    old blog URLs → new ones (Netlify)
```

Replies happen on Fosstodon: add the toot's URL as `fediverse:` in a post's
frontmatter after sharing it.

## License

Content is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
