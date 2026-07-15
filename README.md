# esbuild-plugin-folder-import

A small `esbuild` plugin for importing all files in a folder using a wildcard path with an explicit extension.

## Features

- Supports imports like `./folder/*.ts` and `./folder/*.js`
- Only loads files matching the requested extension
- Exposes generated exports:
  - `modules` — array of imported module objects
  - `namedModules` — object keyed by filename
  - `filenames` — array of included filenames
- Configurable allowed extensions

## Installation

```bash
pnpm add -D esbuild-plugin-folder-import
```

## Usage

Use the plugin with `esbuild` and import a folder with a wildcard extension.

```js
import esbuild from "esbuild";
import FolderImportPlugin from "esbuild-plugin-folder-import";

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
```

### Import syntax

The plugin requires a wildcard import path that includes an extension:

```ts
import { modules, namedModules, filenames } from "./hi/*.ts";
```

This will load every file in `./hi` with the `.ts` extension.

## Plugin API

```ts
interface FolderImportPluginConfig {
  allowedExtensions: string[];
  allowFolders: boolean;
}
```

### `allowedExtensions`

- Default: `["ts", "js"]`
- Accepts extension strings with or without a leading dot
- Restricts which file types are included when resolving the wildcard import

### `allowFolders`

- Default: `false`
- When enabled, directories inside the target folder are checked for an `index` file with the matching extension
- If a directory contains `index.<ext>`, it is included as an import and its directory name is used as the key in `namedModules`

## Generated exports

When the plugin resolves a folder import, it generates a virtual module with:

- `modules`: `any[]` — all imported modules in array form
- `namedModules`: `Record<string, any>` — module objects keyed by filename
- `filenames`: `string[]` — the sorted list of matched filenames

## Example

```ts
import { modules, namedModules, filenames } from "./hi/*.ts";

console.log("modules length", modules.length);
console.log("filenames", filenames);
console.log("namedModules keys", Object.keys(namedModules));

// types.d.ts
declare module "./hi/*.ts" {
  import type { FolderExport } from "esbuild-plugin-folder-import";
  const exportValue: FolderExport<{ message: string }>;
  export = exportValue;
}
```