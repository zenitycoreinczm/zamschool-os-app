import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

import libSubdomainPolicy from "./eslint-rules/lib-subdomain-policy.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    ignores: [
      ".next/**",
      ".next_broken_*/**",
      "node_modules/**",
      "coverage/**",
      "out/**",
      "eslint-rules/lib-legacy-whitelist.json",
    ],
    extends: [...next],
    plugins: {
      "zamschool-local": {
        rules: {
          "lib-subdomain-policy": libSubdomainPolicy,
        },
      },
    },
    rules: {
      "zamschool-local/lib-subdomain-policy": "warn",
    },
  },
]);
