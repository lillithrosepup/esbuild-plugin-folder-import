import esbuild from "esbuild";
import FolderImportPlugin from "esbuild-plugin-folder-import";

async function buildExample() {
  await esbuild.build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    outfile: "dist/index.js",
    plugins: [
      FolderImportPlugin({
        allowedExtensions: [".ts"], // defaults to [".ts", ".js"]
      }),
    ],
    absWorkingDir: process.cwd(),
    platform: "node",
    format: "esm",
    sourcemap: true,
  });
}

buildExample().catch((error) => {
  console.error(error);
  process.exit(1);
});
