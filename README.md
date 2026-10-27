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

pnpm promote drafts/posts/title.md   # move into src/content/, date it today
```

Three guards keep drafts private:

- `.gitignore` excludes `drafts/`.
- The pre-commit hook (`.githooks/pre-commit`) refuses anything under
  `drafts/` and any file with a `draft:` key.
- Content schemas are strict, so a `draft:` key fails the build; CI also
  re-runs the drafts check on every push.

## Layout

```
src/content/posts/   articles, poems/ (URLs: /posts/<slug>/, unchanged from the old blog)
src/content/notes/   short notes, by year
src/content/links/   recommended links, by year
src/content/pages/   about, contact, now, uses
src/plugins/         Markdown plugins (callouts, iframes → links)
scripts/             new, promote, drafts check
public/_redirects    old blog URLs → new ones (Netlify)
```

Replies happen on Fosstodon: add the toot's URL as `fediverse:` in a post's
frontmatter after sharing it.

## License

Content is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
