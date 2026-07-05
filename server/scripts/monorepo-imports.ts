import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const targetDirs = [
  path.join(rootDir, "packages/core/src"),
  path.join(rootDir, "packages/infra/src"),
  path.join(rootDir, "packages/biz/src"),
  path.join(rootDir, "apps/server/src"),
  path.join(rootDir, "apps/server/test"),
];

const mappings = [
  { from: /@\/api\/infra\//g, to: "@hodor/infra/" },
  { from: /@\/api\/biz\//g, to: "@hodor/biz/" },
  { from: /@\/api\/pathRegister(?:\.js)?/g, to: "@hodor/core/utils/pathRegister.js" },
  { from: /@\/api\/schemaToParam(?:\.js)?/g, to: "@hodor/core/utils/schemaToParam.js" },
  { from: /@\/constants\//g, to: "@hodor/core/constants/" },
  { from: /@\/db\//g, to: "@hodor/core/db/" },
  { from: /@\/jobs\//g, to: "@hodor/core/jobs/" },
  { from: /@\/middleware\//g, to: "@hodor/core/middleware/" },
  { from: /@\/types\//g, to: "@hodor/core/types/" },
  { from: /@\/utils\//g, to: "@hodor/core/utils/" },
];

function processDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (stat.isFile() && /\.(ts|js|tsx|jsx|sql)$/.test(file)) {
      let content = fs.readFileSync(filePath, "utf8");
      let changed = false;

      for (const mapping of mappings) {
        if (mapping.from.test(content)) {
          content = content.replace(mapping.from, mapping.to);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`Processed: ${path.relative(rootDir, filePath)}`);
      }
    }
  }
}

console.log("Starting to refactor absolute import paths for Monorepo...");
for (const targetDir of targetDirs) {
  console.log(`Processing directory: ${targetDir}`);
  processDir(targetDir);
}
console.log("Done refactoring imports!");
