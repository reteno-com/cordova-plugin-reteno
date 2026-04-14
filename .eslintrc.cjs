module.exports = {
  root: true,
  ignorePatterns: [
    "node_modules/",
    "example/",
    "src/android/",
    "src/ios/",
    "**/*.min.js",
    "tests/",
  ],
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: ["@cordova/eslint-config", "prettier"],
  overrides: [
    {
      files: ["www/**/*.js"],
      globals: {
        cordova: "readonly",
      },
      rules: {
        "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      },
    }
  ],
};
