import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "../src");

const mappings = [
  { from: /@\/api\/system\//g, to: "@/api/infra/system/" },
  { from: /@\/api\/i18n\//g, to: "@/api/infra/i18n/" },
  { from: /@\/api\/mail\//g, to: "@/api/infra/mail/" },
  { from: /@\/api\/maintenance\//g, to: "@/api/infra/maintenance/" },
  { from: /@\/api\/oss\//g, to: "@/api/infra/oss/" },
  { from: /@\/api\/swarm\//g, to: "@/api/infra/swarm/" },
  { from: /@\/api\/ai\//g, to: "@/api/biz/ai/" },
  { from: /@\/api\/enterprise\//g, to: "@/api/biz/enterprise/" },
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

      for (const mapping of mappings) {
        if (mapping.from.test(content)) {
          content = content.replace(mapping.from, mapping.to);
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

console.log("Starting to fix absolute import paths in server/src...");
processDir(srcDir);
console.log("Done fixing imports!");
