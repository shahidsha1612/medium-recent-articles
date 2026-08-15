#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const START_MARKER = "<!-- MEDIUM-RECENT-ARTICLES:START -->";
const END_MARKER = "<!-- MEDIUM-RECENT-ARTICLES:END -->";

function decodeEntities(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(str) {
  return str.replace(/<[^>]*>/g, "");
}

function extractTag(xml, tag) {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return plain ? decodeEntities(stripTags(plain[1])).trim() : "";
}

function formatDate(pubDate) {
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractThumbnail(contentHtml) {
  const img = contentHtml.match(/<img[^>]*\ssrc="([^"]+)"/i);
  return img ? img[1] : "";
}

function extractExcerpt(contentHtml, maxLen) {
  const spaced = contentHtml.replace(/<\/(p|div|h[1-6]|li)>/gi, " ").replace(/<br\s*\/?>/gi, " ");
  const text = decodeEntities(stripTags(spaced)).replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}...`;
}

function feedUrlForUsername(usernameOrUrl) {
  if (/^https?:\/\//i.test(usernameOrUrl)) return usernameOrUrl;
  const handle = usernameOrUrl.replace(/^@/, "");
  return `https://medium.com/feed/@${handle}`;
}

async function fetchFeed(usernameOrUrl) {
  const url = feedUrlForUsername(usernameOrUrl);
  const res = await fetch(url, {
    headers: { "User-Agent": "medium-recent-articles/1.0 (+https://github.com)" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Medium RSS feed (${url}): HTTP ${res.status}`);
  }
  return res.text();
}

function parseItems(xml, count) {
  const rawItems = xml.split("<item>").slice(1).map((chunk) => chunk.split("</item>")[0]);
  if (rawItems.length === 0) {
    throw new Error("No articles found in the RSS feed. Check the username and that the Medium profile is public.");
  }
  return rawItems.slice(0, count).map((item) => {
    const contentHtml = extractTag(item, "content:encoded");
    return {
      title: extractTag(item, "title"),
      link: extractTag(item, "link").split("?")[0],
      pubDate: extractTag(item, "pubDate"),
      thumbnail: extractThumbnail(contentHtml),
      excerpt: extractExcerpt(contentHtml, 140),
    };
  });
}

const THUMBNAIL_WIDTH = 180;

function buildMarkdown(articles) {
  const cards = articles.map((a) => {
    const date = formatDate(a.pubDate);
    const title = escapeHtml(a.title);
    const excerpt = escapeHtml(a.excerpt);
    const thumbCell = a.thumbnail
      ? `<td width="${THUMBNAIL_WIDTH}" valign="top"><a href="${a.link}"><img src="${a.thumbnail}" width="${THUMBNAIL_WIDTH}" alt="" /></a></td>\n`
      : "";
    return (
      `<table cellpadding="10" cellspacing="0">\n<tr>\n${thumbCell}` +
      `<td valign="top">\n` +
      `<a href="${a.link}"><b>${title}</b></a><br/>\n` +
      `<sub>${date}</sub><br/>\n` +
      `${excerpt}\n` +
      `</td>\n</tr>\n</table>`
    );
  });
  return cards.join("\n\n");
}

function updateReadme(readmePath, markdown) {
  const original = fs.readFileSync(readmePath, "utf8");
  if (!original.includes(START_MARKER) || !original.includes(END_MARKER)) {
    throw new Error(
      `Could not find "${START_MARKER}" / "${END_MARKER}" markers in ${readmePath}. ` +
        "Add both marker lines to your README where the article list should appear."
    );
  }
  const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
  const replacement = `${START_MARKER}\n${markdown}\n${END_MARKER}`;
  const updated = original.replace(pattern, replacement);
  fs.writeFileSync(readmePath, updated, "utf8");
  return updated !== original;
}

function getInput(name, fallback) {
  const envKey = `INPUT_${name.toUpperCase()}`;
  if (process.env[envKey]) return process.env[envKey];
  const argPrefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(argPrefix));
  if (arg) return arg.slice(argPrefix.length);
  return fallback;
}

async function main() {
  const username = getInput("username", "");
  const count = parseInt(getInput("count", "3"), 10) || 3;
  const readmePath = path.resolve(getInput("readme", "README.md"));

  if (!username) {
    throw new Error("Missing required input: username (e.g. --username=your-medium-username)");
  }

  const xml = await fetchFeed(username);
  const articles = parseItems(xml, count);
  const markdown = buildMarkdown(articles);

  if (fs.existsSync(readmePath)) {
    const changed = updateReadme(readmePath, markdown);
    console.log(changed ? `Updated ${readmePath} with ${articles.length} article(s).` : `${readmePath} already up to date.`);
  } else {
    console.log(markdown);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { parseItems, buildMarkdown, updateReadme, feedUrlForUsername, formatDate };
