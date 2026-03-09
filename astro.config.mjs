import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkCodeFenceMath from "./src/plugins/remark-code-fence-math.mjs";

export default defineConfig({
  site: "https://davitmaisuradze.com",
  integrations: [react()],
  markdown: {
    remarkPlugins: [remarkMath, remarkCodeFenceMath],
    rehypePlugins: [rehypeKatex],
  },
});
