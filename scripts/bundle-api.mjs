import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["server/gateway.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "api/index.js",
  packages: "external",
  logLevel: "info",
});
