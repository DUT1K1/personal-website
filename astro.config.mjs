import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync } from "node:fs";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkCodeFenceMath from "./src/plugins/remark-code-fence-math.mjs";

const readFrontmatterDate = (source, field) =>
  source.match(new RegExp(`^${field}:\\s*["']?([^\\s"']+)`, "m"))?.[1];
const readBlogPosts = (directoryPath, routePrefix) => {
  const directory = new URL(directoryPath, import.meta.url);

  return readdirSync(directory)
    .filter((fileName) => /\.mdx?$/.test(fileName))
    .map((fileName) => {
    const source = readFileSync(new URL(fileName, directory), "utf8");
    const lastmod =
      readFrontmatterDate(source, "updatedDate") ??
      readFrontmatterDate(source, "pubDate");

    return {
      draft: /^draft:\s*true\s*$/m.test(source),
      lastmod: lastmod
        ? new Date(`${lastmod}T00:00:00.000Z`).toISOString()
        : undefined,
      pathname: `${routePrefix}${fileName.replace(/\.mdx?$/, "")}/`,
    };
  })
    .filter((post) => !post.draft);
};
const publishedBlogPosts = [
  ...readBlogPosts("./src/content/blog/", "/blog/"),
  ...readBlogPosts("./src/content/blog-ka/", "/ka/blog/"),
];
const hasPublishedBlogPosts = publishedBlogPosts.length > 0;
const blogLastmod = publishedBlogPosts
  .map((post) => post.lastmod)
  .filter(Boolean)
  .sort()
  .at(-1);

export default defineConfig({
  site: "https://davitmaisuradze.com",
  trailingSlash: "always",
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\/+$/, "") || "/";

        return (
          pathname !== "/blogs" &&
          (hasPublishedBlogPosts || pathname !== "/blog")
        );
      },
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const post = publishedBlogPosts.find(
          (candidate) => candidate.pathname === pathname,
        );

        if (post?.lastmod) item.lastmod = post.lastmod;
        if ((pathname === "/blog/" || pathname === "/ka/blog/") && blogLastmod) {
          item.lastmod = blogLastmod;
        }

        return item;
      },
    }),
  ],
  vite: {
    // Pre-bundle three for the dev server, so the skill map's lazy import
    // doesn't trigger a dependency re-optimization mid-session.
    optimizeDeps: {
      include: ["three", "three/examples/jsm/controls/OrbitControls.js"],
    },
  },
  markdown: {
    remarkPlugins: [remarkMath, remarkCodeFenceMath],
    rehypePlugins: [rehypeKatex],
  },
});
