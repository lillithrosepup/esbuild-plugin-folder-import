import { readdir, access } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Plugin } from "esbuild";

export type FolderExport<T> = {
  modules: T[];
  namedModules: Record<string, T>;
  filenames: string[];
};

interface FolderImportPluginConfig {
  /**
   * List of file extensions to scan.
   * Defaults to ["ts", "js"].
   */
  allowedExtensions: string[];
  /**
   * When enabled, directories are checked for an `index` file with the matching
   * wildcard extension and included as a folder import.
   * Defaults off.
   */
  allowFolders: boolean;
}

const FolderImportPlugin = (
  config: Partial<FolderImportPluginConfig> = {},
): Plugin => {
  const defaultConfig: FolderImportPluginConfig = {
    allowedExtensions: ["ts", "js"],
    allowFolders: false,
  };

  const usedConfig = Object.assign(defaultConfig, config);

  usedConfig.allowedExtensions = usedConfig.allowedExtensions.map((extension) =>
    extension.replace(/^\./, "").toLowerCase(),
  );

  return {
    name: "require-context",
    setup: (build) => {
      build.onResolve({ filter: /\/\*\.[^.\/\\]+$/ }, async (args) => {
        if (args.resolveDir === "") {
          return; // Ignore unresolvable paths
        }

        const match = args.path.match(/\/\*\.([^.\/\\]+)$/);
        if (!match) {
          return;
        }

        const extension = match[1]!.toLowerCase();
        if (!usedConfig.allowedExtensions.includes(extension)) {
          return;
        }

        const pathWithoutWildcard = args.path.slice(
          0,
          args.path.length - match[0].length,
        );

        return {
          path: pathWithoutWildcard,
          namespace: "folder-import",
          pluginData: {
            resolveDir: args.resolveDir,
            extension,
          },
        };
      });

      build.onLoad(
        { filter: /.*/, namespace: "folder-import" },
        async (args) => {
          const pluginData = args.pluginData as {
            resolveDir: string;
            extension: string;
          };
          const targetFolder = join(pluginData.resolveDir, args.path);
          const dirEntries = await readdir(targetFolder, {
            withFileTypes: true,
          });
          const files: Array<{ importPath: string; filename: string }> = [];
          const allowFolders = Boolean(usedConfig.allowFolders);

          for (const entry of dirEntries) {
            if (entry.isFile()) {
              if (
                extname(entry.name).slice(1).toLowerCase() ===
                pluginData.extension
              ) {
                files.push({ importPath: entry.name, filename: entry.name });
              }
            } else if (allowFolders && entry.isDirectory()) {
              const indexFile = `index.${pluginData.extension}`;
              try {
                await access(join(targetFolder, entry.name, indexFile));
                files.push({
                  importPath: `${entry.name}/${indexFile}`,
                  filename: entry.name,
                });
              } catch {
                // Ignore directories without a matching index file.
              }
            }
          }

          const sortedFiles = files.sort((a, b) =>
            a.filename.localeCompare(b.filename, undefined, {
              sensitivity: "base",
            }),
          );

          const importerCode = `
        ${sortedFiles
          .map(
            (file, index) =>
              `import * as module${index} from './${file.importPath}'`,
          )
          .join(";")}

        export const modules = [${sortedFiles
          .map((file, index) => `module${index}`)
          .join(",")}];
        
        export const namedModules = {
          ${sortedFiles
            .map((file, index) => `'${file.filename}': module${index}`)
            .join(",\n          ")}
        };

        export const filenames = [${sortedFiles
          .map((file) => `'${file.filename}'`)
          .join(",")}];
      `;

          return { contents: importerCode, resolveDir: targetFolder };
        },
      );
    },
  };
};

export default FolderImportPlugin;
