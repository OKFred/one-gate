import fs from "fs";
import path from "path";

const files = [
  "src/api/swarm/translation.ts",
  "src/api/i18n/translation.ts",
  "src/api/mail/translation.ts",
  "src/api/maintenance/translation.ts",
  "src/api/oss/translation.ts",
  "src/api/enterprise/translation.ts",
  "src/api/system/translation.ts",
  "src/db/translation/shared.ts",
];

function getVarName(biz: string): string {
  // e.g. "maintenance.cron" -> "BIZ_CRON"
  // e.g. "swarm" -> "BIZ_SWARM"
  // e.g. "business.type" -> "BIZ_TYPE"
  const parts = biz.split(".");
  const lastPart = parts[parts.length - 1];

  // Special naming cases to avoid collisions or keep clarity
  if (biz === "business.type") return "BIZ_BUSINESS_TYPE";
  if (biz === "business.exception") return "BIZ_BUSINESS_EXCEPTION";
  if (biz === "infra.businessType") return "BIZ_INFRA_BUSINESS_TYPE";

  return `BIZ_${lastPart.toUpperCase()}`;
}

for (const relPath of files) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`File not found: ${fullPath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, "utf-8");

  // Find all business string literals
  // Regex to match: business: "some.name" or business: 'some.name'
  const businessRegex = /business:\s*(['"])([^'"]+)\1/g;
  const uniqueBiz = new Set<string>();
  let match;
  while ((match = businessRegex.exec(content)) !== null) {
    uniqueBiz.add(match[2]);
  }

  if (uniqueBiz.size === 0) {
    console.log(`No business strings found in ${relPath}`);
    continue;
  }

  console.log(`Refactoring ${relPath} with businesses:`, Array.from(uniqueBiz));

  // Generate variable declarations
  const declarations: string[] = [];
  for (const biz of uniqueBiz) {
    const varName = getVarName(biz);
    declarations.push(`const ${varName} = BUSINESS["${biz}"];`);

    // Replace all occurrences of: business: "biz" or business: 'biz'
    // with: business: varName
    const replaceRegex = new RegExp(
      `business:\\s*(['"])${biz.replace(/\./g, "\\.")}\\1`,
      "g"
    );
    content = content.replace(replaceRegex, `business: ${varName}`);
  }

  // Add imports at the top
  const importBlock =
    `import { BUSINESS } from "@/types/business";\n\n` +
    declarations.join("\n") +
    "\n\n";

  // Find where to insert. We can insert after the first import line, or at the very beginning after removing existing imports of BatchTranslationItem
  // First, check if there's an import of BatchTranslationItem
  if (
    content.includes(
      'import type { BatchTranslationItem } from "@/db/initTranslation";'
    )
  ) {
    content = content.replace(
      'import type { BatchTranslationItem } from "@/db/initTranslation";',
      `import type { BatchTranslationItem } from "@/db/initTranslation";\n` +
        importBlock.trim()
    );
  } else if (
    content.includes(
      'import type { BatchTranslationItem } from "../../db/initTranslation";'
    )
  ) {
    content = content.replace(
      'import type { BatchTranslationItem } from "../../db/initTranslation";',
      `import type { BatchTranslationItem } from "../../db/initTranslation";\n` +
        importBlock.trim()
    );
  } else {
    content = importBlock + content;
  }

  // Clean up any double empty lines or formatting issues we might have introduced
  content = content.replace(/\n{3,}/g, "\n\n");

  fs.writeFileSync(fullPath, content, "utf-8");
  console.log(`✅ Successfully refactored ${relPath}`);
}
