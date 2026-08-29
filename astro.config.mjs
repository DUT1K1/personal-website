import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync } from "node:fs";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkCodeFenceMath from "./src/plugins/remark-code-fence-math.mjs";

const blogDirectory = new URL("./src/content/blog/", import.meta.url);
const hasPublishedBlogPosts = readdirSync(blogDirectory)
  .filter((fileName) => /\.mdx?$/.test(fileName))
  .some((fileName) => {
    const source = readFileSync(new URL(fileName, blogDirectory), "utf8");
    return !/^draft:\s*true\s*$/m.test(source);
  });

export default defineConfig({
  site: "https://www.davitmaisuradze.com",
  integrations: [
    react(),
    sitemap({
      filter: (page) => hasPublishedBlogPosts || !page.endsWith("/blog/"),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath, remarkCodeFenceMath],
    rehypePlugins: [rehypeKatex],
  },
});
