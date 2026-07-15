import { modules, namedModules, filenames } from "./hi/*.ts";

console.log("modules length", modules.length);
console.log("filenames", filenames);
console.log("namedModules keys", Object.keys(namedModules));

for (const filename of filenames) {
  const module = namedModules[filename]!;
  console.log(`loaded ${filename}:`, module.message);
}
