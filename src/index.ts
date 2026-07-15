import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Plugin } from "esbuild";

export type FolderExport<T> = {
  modules: T[];
  namedModules: Record<string, T>;
  filenames: string[];
};

interface FolderImportPluginConfig {
  allowedExtensions: string[];
}

const FolderImportPlugin = (
  config: Partial<FolderImportPluginConfig> = {},
): Plugin => {
  const defaultConfig: FolderImportPluginConfig = {
    allowedExtensions: ["ts", "js"],
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
          const files = await readdir(targetFolder)
            .then((entries) =>
              entries.filter(
                (file) =>
                  extname(file).slice(1).toLowerCase() === pluginData.extension,
              ),
            )
            .then((entries) => entries.sort());

          const importerCode = `
        ${files
          .map(
            (module, index) => `import * as module${index} from './${module}'`,
          )
          .join(";")}

        export const modules = [${files
          .map((module, index) => `module${index}`)
          .join(",")}];
        
        export const namedModules = {
          ${files
            .map((module, index) => `'${module}': module${index}`)
            .join(",\n          ")}
        };

        export const filenames = [${files
          .map((module, index) => `'${module}'`)
          .join(",")}];
      `;

          return { contents: importerCode, resolveDir: targetFolder };
        },
      );
    },
  };
};

export default FolderImportPlugin;
