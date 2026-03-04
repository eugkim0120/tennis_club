import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "node",
      testMatch: ["<rootDir>/src/lib/**/*.test.ts"],
      transform: { "^.+\\.tsx?$": "ts-jest" },
      testEnvironment: "node",
      transformIgnorePatterns: ["node_modules/(?!uuid/)"],
    },
    {
      displayName: "jsdom",
      testMatch: ["<rootDir>/src/**/*.test.tsx"],
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
      testEnvironment: "jsdom",
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      transformIgnorePatterns: ["node_modules/(?!uuid/)"],
    },
  ],
};

export default config;
