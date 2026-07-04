import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "../src");

const mappings = [
  // 1. Alias imports
  { from: /@\/api\/system\//g, to: "@/api/infra/system/" },
  { from: /@\/api\/i18n\//g, to: "@/api/infra/i18n/" },
  { from: /@\/api\/mail\//g, to: "@/api/infra/mail/" },
  { from: /@\/api\/maintenance\//g, to: "@/api/infra/maintenance/" },
  { from: /@\/api\/oss\//g, to: "@/api/infra/oss/" },
  { from: /@\/api\/swarm\//g, to: "@/api/infra/swarm/" },
  { from: /@\/api\/ai\//g, to: "@/api/biz/ai/" },
  { from: /@\/api\/enterprise\//g, to: "@/api/biz/enterprise/" },

  // 2. URL paths
  { from: /'\/api\/v1\/system\//g, to: "'/api/v1/infra/system/" },
  { from: /'\/api\/v1\/i18n\//g, to: "'/api/v1/infra/i18n/" },
  { from: /'\/api\/v1\/mail\//g, to: "'/api/v1/infra/mail/" },
  { from: /'\/api\/v1\/maintenance\//g, to: "'/api/v1/infra/maintenance/" },
  { from: /'\/api\/v1\/oss\//g, to: "'/api/v1/infra/oss/" },
  { from: /'\/api\/v1\/swarm\//g, to: "'/api/v1/infra/swarm/" },
  { from: /'\/api\/v1\/ai\//g, to: "'/api/v1/biz/ai/" },
  { from: /'\/api\/v1\/enterprise\//g, to: "'/api/v1/biz/enterprise/" },
];

function processDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (stat.isFile() && /\.(ts|js|tsx|jsx)$/.test(file)) {
      let content = fs.readFileSync(filePath, "utf8");
      let changed = false;

      // Apply standard mappings (aliases and URLs)
      for (const mapping of mappings) {
        if (mapping.from.test(content)) {
          content = content.replace(mapping.from, mapping.to);
          changed = true;
        }
      }

      // Check for config and queue relative imports within newly nested api subfolders
      const isNestedApiFile =
        filePath.includes(path.join("src", "api", "infra")) ||
        filePath.includes(path.join("src", "api", "biz"));

      if (isNestedApiFile) {
        // '../config' -> '../../config'
        const configRegex = /from\s+['"]\.\.\/config['"]/g;
        if (configRegex.test(content)) {
          content = content.replace(configRegex, "from '../../config'");
          changed = true;
        }

        // '../queue' -> '../../queue'
        const queueRegex = /from\s+['"]\.\.\/queue['"]/g;
        if (queueRegex.test(content)) {
          content = content.replace(queueRegex, "from '../../queue'");
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`Processed: ${path.relative(srcDir, filePath)}`);
      }
    }
  }
}

console.log("Starting to fix frontend imports and paths in platform/src...");
processDir(srcDir);
console.log("Done fixing frontend imports and paths!");
