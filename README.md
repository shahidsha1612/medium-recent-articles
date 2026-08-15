# Medium Recent Articles

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Medium%20Recent%20Articles-green?logo=github)](https://github.com/marketplace/actions/medium-recent-articles)

This shows your latest Medium blog posts on your GitHub profile page, and keeps them updated automatically. It's free and needs no coding.

Each post is shown as a small card: a thumbnail, title, date, and a short preview, all pulled straight from the post itself. Thumbnails are all shown at a uniform 180x120 size with no stretching or distortion. GitHub blocks the CSS (`object-fit`) that would normally do this kind of cropping in the browser, so instead the crop is requested straight from Medium's own image CDN (it sends back an already-cropped image), which works without needing any CSS at all. It automatically matches whatever theme (light or dark) the viewer has GitHub set to, since it never hardcodes any colors.

Note: GitHub strips all CSS/JavaScript from rendered READMEs for security, so hover effects or animations aren't possible here. The cards are intentionally static and dependency-free.

## Step-by-step guide (no experience needed)

### Step 1: Create your special GitHub profile repo

GitHub has a secret trick: if you make a repo with the **exact same name** as your username, GitHub shows its README on your profile page.

1. Go to https://github.com/new
2. In "Repository name", type your GitHub username **exactly** (e.g. if your username is `janedoe`, name the repo `janedoe`)
3. Choose **Public**
4. Tick the box **"Add a README file"**
5. Click the green **"Create repository"** button

*(Already have this repo? Just skip to Step 2.)*

### Step 2: Add two "magic comment" lines

These two lines tell the tool exactly where to put your article list. They won't show up on your profile, since GitHub hides comments.

1. On your new repo's page, click on `README.md`
2. Click the pencil ✏️ icon (top right) to edit it
3. Paste these two lines anywhere in the file:

   ```
   <!-- MEDIUM-RECENT-ARTICLES:START -->
   <!-- MEDIUM-RECENT-ARTICLES:END -->
   ```

4. Scroll down and click **"Commit changes"**

### Step 3: Add the auto-update robot

This is a little robot (called a "workflow") that visits Medium every day and updates your README for you.

1. In your repo, click **"Add file"** → **"Create new file"**
2. In the name box, type exactly:
   ```
   .github/workflows/update-readme.yml
   ```
   (typing the slashes will automatically create the folders, that's normal)
3. Paste this in the big text box:

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
         - uses: shahidsha1612/medium-recent-articles@v1
           with:
             username: YOUR_MEDIUM_USERNAME
             count: "3"
             link_titles: "true"
         - run: |
             git config user.name "github-actions[bot]"
             git config user.email "github-actions[bot]@users.noreply.github.com"
             git add README.md
             git diff --cached --quiet || git commit -m "chore: update recent Medium articles"
             git push
   ```

4. **Important:** replace `YOUR_MEDIUM_USERNAME` with your real Medium username (the part after the `@` on your Medium profile URL, e.g. `medium.com/@janedoe` becomes `janedoe`)
5. Click **"Commit changes"**

Two settings you can change any time:
- `count` is how many recent articles show up. Change `"3"` to any number you like.
- `link_titles` controls whether the article title is a clickable link. Set it to `"false"` if you'd rather have plain bold text with no link.

### Step 4: Test it right now (don't wait a day)

1. Click the **"Actions"** tab at the top of your repo
2. On the left, click **"Update README with recent Medium articles"**
3. Click the **"Run workflow"** button, then click the green **"Run workflow"** that appears
4. Wait about 30 seconds, then click on your repo's name to go back to the main page
5. Refresh the page. Your recent Medium articles should now be listed! 🎉

That's it. From now on, it updates itself every day. You never have to touch it again.

### Something not working?

- **No list appeared** → Open your `README.md` and check the two comment lines from Step 2 are still there, spelled exactly right.
- **Red ❌ on the Actions tab** → Click on it to read the message. This almost always means the Medium username in Step 3 is misspelled, or that Medium account doesn't exist or has no public posts.
- **Want more or fewer articles** → Change `count: "3"` to any number you like.
- **Still stuck** → Open an issue on this repo and paste the error message you see.

---

## For developers

This is a self-contained alternative to [`github-readme-medium-recent-article`](https://github.com/bxcodec/github-readme-medium-recent-article), which relies on a hosted third-party service (a Vercel deployment that scrapes Medium) that can go down or break whenever Medium changes its page structure.

Instead, this tool:
- Reads Medium's own public RSS feed (`https://medium.com/feed/@username`), a stable, official format Medium has supported for years, not scraped HTML.
- Runs entirely in your own GitHub repo (as a GitHub Action above) or on your own machine (as a plain Node script).
- Has **zero dependencies**, just one file (`index.js`) using Node's built-in `fetch`.
- Never depends on any external hosted service being up.

### Run it yourself, no GitHub Action needed

```bash
node index.js --username=your-medium-username --count=3 --readme=README.md
```

- `--username`: your Medium username (with or without `@`), or a full RSS URL if you use a custom domain.
- `--count`: how many recent articles to list (default `3`).
- `--readme`: path to the file to update (default `README.md`). If the file doesn't exist, the Markdown is printed to stdout instead.
- `--link_titles`: set to `false` to render titles as plain bold text instead of a clickable link (default `true`).

Run this from a cron job, a pre-commit hook, or however you like. It's a plain script.

### Action inputs

| Input         | Required | Default      | Description                                                    |
|---------------|----------|--------------|------------------------------------------------------------------|
| `username`    | yes      | none         | Medium username (with or without `@`), or full RSS URL           |
| `count`       | no       | `3`          | Number of recent articles to include                             |
| `readme`      | no       | `README.md`  | Path to the README file to update                                 |
| `link_titles` | no       | `true`       | `false` renders titles as plain bold text instead of a link       |

Note on customizing colors/fonts: GitHub strips `style` attributes and `<font>` tags from rendered READMEs (verified: they're silently removed), so there's no way to make card colors or fonts customizable on a GitHub profile page. That's a GitHub platform limitation, not something this tool can work around without depending on a live external rendering service again.

A full example workflow is also available at [`examples/update-readme.yml`](examples/update-readme.yml).

### Tested

Verified end-to-end against a live Medium account:
- Fetches and correctly parses the real RSS feed into title/link/date.
- Correctly replaces content between markers and leaves the rest of the file untouched.
- Re-running when nothing changed is a safe no-op (won't create empty commits).
- Fails with a clear error message (and non-zero exit code) for: missing username, missing markers in the target file, and a non-existent Medium username.
