import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 包源码的根路径
const PACKAGES_DIR = path.resolve(__dirname, "../packages");
const CORE_DIR = path.resolve(PACKAGES_DIR, "core/src");

// 目标文件路径
const BUSINESS_TS_PATH = path.resolve(CORE_DIR, "types/business.ts");
const PERMISSIONS_TS_PATH = path.resolve(CORE_DIR, "constants/permissions.ts");

/**
 * 递归扫描包含 encapsulation(service 调用的 index.ts 路由文件
 */
function scanRoutes(
  dir: string,
  packageName: string,
  relativePathParts: string[] = []
): Array<{ filePath: string; businessKey: string }> {
  const routes: Array<{ filePath: string; businessKey: string }> = [];
  if (!fs.existsSync(dir)) return routes;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      routes.push(
        ...scanRoutes(path.join(dir, entry.name), packageName, [
          ...relativePathParts,
          entry.name,
        ])
      );
    } else if (entry.isFile() && entry.name === "index.ts") {
      const filePath = path.join(dir, entry.name);
      const content = fs.readFileSync(filePath, "utf-8");

      // 仅当 index.ts 中包含 encapsulation( 并且在 createApp 函数内时，才认定为 API 路由入口
      if (content.includes("encapsulation(") && content.includes("createApp")) {
        const businessKey = getBusinessKey(packageName, relativePathParts);
        routes.push({ filePath, businessKey });
      }
    }
  }
  return routes;
}

/**
 * 根据包名和物理路径推导对应的 BusinessKey 命名空间
 */
function getBusinessKey(
  packageName: string,
  relativePathParts: string[]
): string {
  const snakeParts = relativePathParts.map((p) => p.replace(/-/g, "_"));
  if (packageName === "admin") {
    return ["admin", ...snakeParts].join(".");
  } else if (packageName === "personal") {
    return ["personal", ...snakeParts].join(".");
  } else if (packageName === "enterprise") {
    // enterprise 包下的子路由在 permissions 和 business 中不带 enterprise 前缀，直接以相对路径拼接
    return snakeParts.join(".");
  }
  return [packageName, ...snakeParts].join(".");
}

function fixRouteFile(filePath: string, correctKey: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  // 匹配 encapsulation(service, "xxx" satisfies BusinessKey) 或 encapsulation(service, "xxx") 等各种空格和换行格式
  // 捕获组: 1=前缀, 2=引号字符, 3=内部字符串, 4=satisfies, 5=闭合括号
  const encapsulationReg =
    /(encapsulation\s*\(\s*service\s*,\s*)(['"`])(.*?)\2(\s*satisfies\s+BusinessKey)?(\s*\))/s;

  const match = encapsulationReg.exec(content);
  if (match) {
    const quoteChar = match[2];
    const currentKey = match[3];
    const hasSatisfies = !!match[4];

    // 如果已经一致且带有 satisfies，就不需要写入，防止不必要的文件写入触发重新编译或热更新
    if (currentKey === correctKey && hasSatisfies) {
      return;
    }

    const newCall = `${match[1]}${quoteChar}${correctKey}${quoteChar} satisfies BusinessKey${match[5]}`;
    const newContent = content.replace(encapsulationReg, newCall);

    fs.writeFileSync(filePath, newContent, "utf-8");
    console.log(
      `✏️  [修正路由] 纠正文件 ${path.basename(path.dirname(filePath))}/${path.basename(filePath)} 中的 businessKey 为: "${correctKey}"`
    );
  }
}

/**
 * 更新 business.ts 文件，确保声明了所有的 BusinessKey
 */
function updateBusinessTs(businessKeys: string[]) {
  let content = fs.readFileSync(BUSINESS_TS_PATH, "utf-8");

  // 匹配 business.ts 中已定义的所有 Key
  const keyReg = /['"]([^'"]+)['"]\s*:\s*['"]\1['"]/g;
  const definedKeys = new Set<string>();
  let m;
  while ((m = keyReg.exec(content)) !== null) {
    definedKeys.add(m[1]);
  }

  let updated = false;
  for (const key of businessKeys) {
    if (definedKeys.has(key)) {
      continue;
    }
    definedKeys.add(key);

    // 寻找 BUSINESS 对象的闭合大括号之前插入
    const endReg = /\}\s*as\s*const\s*;/;
    const match = endReg.exec(content);
    if (match) {
      const insertIndex = match.index;
      const insertion = `  /** 自动生成: ${key} */\n  "${key}": "${key}",\n`;
      content =
        content.slice(0, insertIndex) + insertion + content.slice(insertIndex);
      updated = true;
      console.log(`➕ [业务代码] 自动向 business.ts 添加 Key: "${key}"`);
    }
  }

  if (updated) {
    fs.writeFileSync(BUSINESS_TS_PATH, content, "utf-8");
  }
}

/**
 * AST 解析 permissions.ts 收集已定义的所有权限路径
 */
function getDefinedPermissions(): Set<string> {
  const content = fs.readFileSync(PERMISSIONS_TS_PATH, "utf-8");
  const sourceFile = ts.createSourceFile(
    "permissions.ts",
    content,
    ts.ScriptTarget.Latest,
    true
  );

  let permissionSeedsNode: ts.ObjectLiteralExpression | null = null;
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "permissionSeeds"
    ) {
      let initializer = node.initializer;
      while (
        initializer &&
        (ts.isAsExpression(initializer) ||
          ts.isSatisfiesExpression(initializer))
      ) {
        initializer = initializer.expression;
      }
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        permissionSeedsNode = initializer;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  const definedPaths = new Set<string>();
  if (!permissionSeedsNode) return definedPaths;

  function collectPaths(node: ts.ObjectLiteralExpression, parentPath = "") {
    node.properties.forEach((prop) => {
      if (!ts.isPropertyAssignment(prop)) return;

      let key = "";
      if (ts.isIdentifier(prop.name)) {
        key = prop.name.text;
      } else if (ts.isStringLiteral(prop.name)) {
        key = prop.name.text;
      }
      if (!key) return;

      const currentPath = parentPath
        ? key === ""
          ? parentPath
          : `${parentPath}.${key}`
        : key;
      if (key !== "") {
        definedPaths.add(currentPath);
      }

      if (ts.isObjectLiteralExpression(prop.initializer)) {
        collectPaths(prop.initializer, currentPath);
      }
    });
  }
  collectPaths(permissionSeedsNode);
  return definedPaths;
}

/**
 * 更新 permissions.ts 中的 permissionSeeds
 */
function updatePermissionsTs(businessKeys: string[]) {
  // 因为每次插入都需要重新解析来避免字符串偏移问题，因此针对每个缺失 key 独立读写
  for (const key of businessKeys) {
    const definedPaths = getDefinedPermissions();
    if (definedPaths.has(key)) continue;

    let content = fs.readFileSync(PERMISSIONS_TS_PATH, "utf-8");

    // 拆分 parentKey 和 subKey
    const parts = key.split(".");
    let parentKey = "";
    let subKey = "";

    if (parts.length === 2) {
      parentKey = parts[0];
      subKey = parts[1];
    } else if (parts.length >= 3) {
      parentKey = parts.slice(0, parts.length - 1).join(".");
      subKey = parts[parts.length - 1];
    } else {
      // 只有一级路径
      parentKey = key;
    }

    if (parentKey && subKey) {
      // 检查 subKey 是否为合法的标示符，否则用引号包裹防止语法错误
      const subKeyProp = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(subKey)
        ? subKey
        : `"${subKey}"`;

      // 情况 1: 父级已在 permissions.ts 中定义，直接在其子对象中插入 subKey
      const parentReg = new RegExp(
        `(['"\`])${parentKey.replace(/\./g, "\\.")}\\1\\s*:\\s*\\{`
      );
      const match = parentReg.exec(content);

      if (match) {
        const insertIndex = match.index + match[0].length;
        const insertion = `\n    /** 自动生成: ${subKey} */\n    ${subKeyProp}: ["read", "add", "edit", "delete"],`;
        content =
          content.slice(0, insertIndex) +
          insertion +
          content.slice(insertIndex);
        fs.writeFileSync(PERMISSIONS_TS_PATH, content, "utf-8");
        console.log(
          `➕ [权限定义] 自动向 permissions.ts 中的 "${parentKey}" 下添加子权限: "${subKey}"`
        );
        continue;
      }
    }

    // 情况 2: 父级也未定义，需要把整个根层级插入到 permissionSeeds 的最外层
    const rootReg = /export\s+const\s+permissionSeeds\s*=\s*\{/;
    const match = rootReg.exec(content);
    if (match) {
      const insertIndex = match.index + match[0].length;
      let insertion = "";
      if (subKey) {
        const subKeyProp = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(subKey)
          ? subKey
          : `"${subKey}"`;
        insertion = `\n  /** 自动生成: ${parentKey} */\n  "${parentKey}": {\n    "": ["read"],\n    /** 自动生成: ${subKey} */\n    ${subKeyProp}: ["read", "add", "edit", "delete"],\n  },`;
      } else {
        insertion = `\n  /** 自动生成: ${key} */\n  "${key}": {\n    "": ["read"],\n  },`;
      }

      content =
        content.slice(0, insertIndex) + insertion + content.slice(insertIndex);
      fs.writeFileSync(PERMISSIONS_TS_PATH, content, "utf-8");
      console.log(
        `➕ [权限定义] 自动向 permissions.ts 最外层添加模块权限: "${parentKey}"`
      );
    }
  }
}

function main() {
  console.log("🔍 开始扫描 API 路由以推导 BusinessKey...");

  const packages = ["admin", "enterprise", "personal"];
  const allRoutes: Array<{ filePath: string; businessKey: string }> = [];

  for (const pkg of packages) {
    const srcDir = path.resolve(PACKAGES_DIR, `${pkg}/src`);
    const routes = scanRoutes(srcDir, pkg);
    allRoutes.push(...routes);
  }

  console.log(
    `📦 扫描完成，共检测到 ${allRoutes.length} 个有效的 API 路由入口`
  );

  // 1. 纠正所有 index.ts 中的 BusinessKey
  for (const route of allRoutes) {
    fixRouteFile(route.filePath, route.businessKey);
  }

  const businessKeys = allRoutes.map((r) => r.businessKey);

  // 2. 自动更新 business.ts
  updateBusinessTs(businessKeys);

  // 3. 自动更新 permissions.ts
  updatePermissionsTs(businessKeys);

  // 4. 执行 permissions 同步，更新前端 usePermission.ts
  console.log("🔄 开始执行权限码同步以更新前端 usePermission.ts...");
  try {
    execSync("npx tsx scripts/sync-permissions.ts", {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
    });
    console.log("✅ 权限码同步成功！");
  } catch (err) {
    console.error("❌ 权限码同步脚本执行失败:", err);
  }

  console.log("🎉 全部同步任务已完成。");
}

main();
