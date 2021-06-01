module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: ["airbnb-base", "prettier"],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    camelcase: "off",
    "func-names": "off",
    "global-require": "off",
    "import/extensions": "off",
    "import/no-dynamic-require": "off",
    "no-bitwise": "off",
    "no-console": "off",
    "no-param-reassign": "off",
    "no-plusplus": "off",
    "no-use-before-define": "off",
  },
  globals: {
    config: true,
  },
};
