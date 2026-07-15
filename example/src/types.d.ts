declare module "./hi/*.ts" {
  import type { FolderExport } from "esbuild-plugin-folder-import";
  const exportValue: FolderExport<{ message: string }>;
  export = exportValue;
}
