# Medium Recent Articles

A small, self-contained tool that adds a list of your recent Medium articles to your GitHub profile README.

This is a simpler replacement for [`github-readme-medium-recent-article`](https://github.com/bxcodec/github-readme-medium-recent-article), which relies on a hosted third-party service (a Vercel deployment that scrapes Medium) that can go down or break whenever Medium changes its page structure.

Instead, this tool:
- Reads Medium's own public RSS feed (`https://medium.com/feed/@username`) — a stable, official format Medium has supported for years, not scraped HTML.
- Runs entirely in your own GitHub repo (as a GitHub Action) or on your own machine (as a plain Node script).
- Has **zero dependencies** — just one file (`index.js`) using Node's built-in `fetch`.
- Never depends on any external hosted service being up.

## How it works

1. Add two marker comments to your `README.md` where you want the article list to appear:

   ```md
   <!-- MEDIUM-RECENT-ARTICLES:START -->
   <!-- MEDIUM-RECENT-ARTICLES:END -->
   ```

2. Run the script, pointing it at your Medium username. It fetches your RSS feed and replaces everything between the markers with a Markdown list of your latest articles — everything else in the file is left untouched.

## Option A: run it yourself (no GitHub Action needed)

```bash
node index.js --username=your-medium-username --count=3 --readme=README.md
```

- `--username` — your Medium username (with or without `@`), or a full RSS URL if you use a custom domain.
- `--count` — how many recent articles to list (default `3`).
- `--readme` — path to the file to update (default `README.md`). If the file doesn't exist, the Markdown is printed to stdout instead.

Run this from a cron job, a pre-commit hook, or however you like — it's a plain script.

## Option B: run it automatically as a GitHub Action

1. Push this folder to a GitHub repo (e.g. `your-username/medium-recent-articles`).
2. In your **profile README repo** (`your-username/your-username`), add a workflow at `.github/workflows/update-readme.yml` (an example is included at [`examples/update-readme.yml`](examples/update-readme.yml)):

   ```yaml
   on:
     schedule:
       - cron: "0 6 * * *"
     workflow_dispatch: {}

   permissions:
     contents: write

   jobs:
     update-readme:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: your-username/medium-recent-articles@main
           with:
             username: your-medium-username
             count: "3"
         - run: |
             git config user.name "github-actions[bot]"
             git config user.email "github-actions[bot]@users.noreply.github.com"
             git add README.md
             git diff --cached --quiet || git commit -m "chore: update recent Medium articles"
             git push
   ```

3. Make sure your `README.md` has the `START`/`END` markers shown above.

That's it — no API tokens, no secrets, no third-party site to embed images from.

## Tested

Verified end-to-end against a live Medium account (`your-medium-username`):
- Fetches and correctly parses the real RSS feed into title/link/date.
- Correctly replaces content between markers and leaves the rest of the file untouched.
- Re-running when nothing changed is a safe no-op (won't create empty commits).
- Fails with a clear error message (and non-zero exit code) for: missing username, missing markers in the target file, and a non-existent Medium username.
