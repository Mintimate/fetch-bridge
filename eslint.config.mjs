import parser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  { ignores: [".next/**", "node_modules/**", "prisma/generated/**"] },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: { parser },
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "no-console": "warn",
      "no-debugger": "error"
    }
  }
];
