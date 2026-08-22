import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkCodeFenceMath from "./src/plugins/remark-code-fence-math.mjs";

export default defineConfig({
  site: "https://www.davitmaisuradze.com",
  integrations: [react(), sitemap()],
  markdown: {
    remarkPlugins: [remarkMath, remarkCodeFenceMath],
    rehypePlugins: [rehypeKatex],
  },
});
