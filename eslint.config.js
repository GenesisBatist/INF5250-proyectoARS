const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["dist/js/adminlte*.js", "dist/js/**/*.min.js", "dist/js/**/*.bak"] },
  js.configs.recommended,
  {
    files: ["dist/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, bootstrap: "readonly", $: "readonly", jQuery: "readonly", ARSAuth: "readonly" }
    },
    rules: { "no-console": "warn" }
  }
];