import next from "eslint-config-next";
const config = [...next, { ignores: ["src/generated/**", "mobile/**"] }];
export default config;
