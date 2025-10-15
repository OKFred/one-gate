import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
const traverseFunc = (traverse as any).default;

interface DependencyGraph {
  [filePath: string]: {
    static: string[]; // 静态导入
    dynamic: string[]; // 动态导入
    computed: string[]; // 需要运行时计算的导入
  };
}

function analyzeImports(code: string, filePath: string) {
  const result = {
    static: [] as string[],
    dynamic: [] as string[],
    computed: [] as string[],
  };

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    // 检测特殊模式：调用 subFolderBatchRegister 并传入 __dirname
    let callsSubFolderBatchRegister = false;
    let subFolderBatchRegisterPath: string | null = null;

    traverseFunc(ast, {
      // 静态 import
      ImportDeclaration(path) {
        result.static.push(path.node.source.value);
        // 检测是否导入了 subFolderBatchRegister
        if (path.node.source.value.includes("subFolderBatchRegister")) {
          subFolderBatchRegisterPath = path.node.source.value;
        }
      },

      // require() 和 import()
      CallExpression(nodePath) {
        const { callee, arguments: args } = nodePath.node;

        // 检测调用 subFolderBatchRegister(app, "/api", __dirname)
        if (
          callee.type === "Identifier" &&
          callee.name === "subFolderBatchRegister" &&
          args.length >= 3
        ) {
          callsSubFolderBatchRegister = true;
        }

        // import() 动态导入
        if (callee.type === "Import" && args.length > 0) {
          const arg = args[0];

          if (arg.type === "StringLiteral") {
            // import('./path') - 字符串字面量
            result.dynamic.push(arg.value);
          } else if (arg.type === "TemplateLiteral") {
            // import(`./path/${variable}`) - 模板字符串
            const quasi = arg.quasis[0]?.value.cooked;
            if (quasi) {
              result.computed.push(`template:${quasi}*`);
            }
          } else if (arg.type === "MemberExpression") {
            // import(pathToFileURL(route.indexFilePath).href)
            // 这是一个成员访问表达式，标记为运行时动态导入
            result.computed.push("runtime:pathToFileURL");
          } else if (arg.type === "CallExpression") {
            // 其他函数调用
            result.computed.push("runtime:function-call");
          } else {
            // 其他复杂表达式
            result.computed.push("runtime:expression");
          }
        }

        // require()
        if (
          callee.type === "Identifier" &&
          callee.name === "require" &&
          args.length > 0
        ) {
          const arg = args[0];
          if (arg.type === "StringLiteral") {
            result.static.push(arg.value);
          } else {
            result.computed.push("require:computed");
          }
        }
      },
    });

    // 如果调用了 subFolderBatchRegister，标记为特殊的 computed 类型
    if (callsSubFolderBatchRegister && subFolderBatchRegisterPath) {
      result.computed.push(`subfolder-batch:${subFolderBatchRegisterPath}`);
    }
  } catch (error) {
    console.error(`Parse error in ${filePath}:`, error);
  }

  return result;
}

function analyzeDependencies(
  entryFile: string,
  projectRoot: string
): DependencyGraph {
  const graph: DependencyGraph = {};
  const visited = new Set<string>();

  function analyzeFile(filePath: string) {
    const absolutePath = path.resolve(projectRoot, filePath);

    if (visited.has(filePath) || !fs.existsSync(absolutePath)) {
      return;
    }

    visited.add(filePath);
    const code = fs.readFileSync(absolutePath, "utf-8");
    const imports = analyzeImports(code, filePath);

    // 解析所有导入路径为实际文件路径
    const resolvedStatic = imports.static
      .map((imp) => resolveImportPath(imp, absolutePath, projectRoot))
      .filter(Boolean) as string[];

    const resolvedDynamic = imports.dynamic
      .map((imp) => resolveImportPath(imp, absolutePath, projectRoot))
      .filter(Boolean) as string[];

    graph[filePath] = {
      static: resolvedStatic,
      dynamic: resolvedDynamic,
      computed: imports.computed,
    };

    // 继续分析静态和可解析的动态导入
    const resolvableImports = [...resolvedStatic, ...resolvedDynamic];

    for (const resolvedPath of resolvableImports) {
      analyzeFile(resolvedPath);
    }

    // 对于 computed 导入，尝试启发式分析
    for (const computed of imports.computed) {
      if (computed.startsWith("template:")) {
        // 分析目录下所有可能的文件
        const pattern = computed.replace("template:", "").replace("*", "");
        const dir = path.dirname(
          path.resolve(path.dirname(absolutePath), pattern)
        );
        if (fs.existsSync(dir)) {
          const possibleFiles = findPossibleImports(dir);
          possibleFiles.forEach((file) => analyzeFile(file));
        }
      } else if (computed.startsWith("subfolder-batch:")) {
        // 处理 subFolderBatchRegister 模式
        // 找到当前文件所在目录下的所有子文件夹的 index 文件
        const currentDir = path.dirname(absolutePath);
        const subApis = discoverSubFolderApis(currentDir);

        // 将发现的文件添加到动态依赖中
        graph[filePath].dynamic = [...graph[filePath].dynamic, ...subApis];

        // 继续分析这些文件
        subApis.forEach((file) => analyzeFile(file));
      }
    }
  }

  analyzeFile(entryFile);
  return graph;
}

function resolveImportPath(
  importPath: string,
  currentFilePath: string,
  projectRoot: string
): string | null {
  let resolvedPath: string;

  // 处理路径别名 @/ -> src/
  if (importPath.startsWith("@/")) {
    resolvedPath = path.resolve(projectRoot, "src", importPath.substring(2));
  } else if (importPath.startsWith(".") || importPath.startsWith("/")) {
    // 相对路径
    const currentDir = path.dirname(currentFilePath);
    resolvedPath = path.resolve(currentDir, importPath);
  } else {
    // node_modules 依赖，跳过
    return null;
  }

  const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];

  for (const ext of extensions) {
    const testPath = resolvedPath + ext;
    if (fs.existsSync(testPath)) {
      // 返回相对于项目根目录的路径，使用正斜杠
      return path.relative(projectRoot, testPath).replace(/\\/g, "/");
    }
  }

  if (fs.existsSync(resolvedPath)) {
    return path.relative(projectRoot, resolvedPath).replace(/\\/g, "/");
  }

  return null;
}

function findPossibleImports(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const indexPath = path.join(fullPath, "index.ts");
      if (fs.existsSync(indexPath)) {
        // 返回相对路径，使用正斜杠
        const relativePath = path.relative(process.cwd(), indexPath);
        files.push(relativePath.replace(/\\/g, "/"));
      }
    } else if (item.match(/\.(ts|js|tsx|jsx)$/)) {
      const relativePath = path.relative(process.cwd(), fullPath);
      files.push(relativePath.replace(/\\/g, "/"));
    }
  }

  return files;
}

// 发现目录下所有子文件夹的 index 入口文件
function discoverSubFolderApis(dir: string): string[] {
  const subApis: string[] = [];

  if (!fs.existsSync(dir)) return subApis;

  const folders = fs.readdirSync(dir).filter((item) => {
    const fullPath = path.join(dir, item);
    try {
      return fs.statSync(fullPath).isDirectory();
    } catch {
      return false;
    }
  });

  for (const folder of folders) {
    const folderPath = path.join(dir, folder);
    try {
      const files = fs.readdirSync(folderPath);

      for (const file of files) {
        if (/index\.(ts|js)/.test(file)) {
          const indexPath = path.join(folderPath, file);
          // 返回相对路径，使用正斜杠
          subApis.push(
            path.relative(process.cwd(), indexPath).replace(/\\/g, "/")
          );
          break;
        }
      }
    } catch {
      // 忽略无法访问的文件夹
      continue;
    }
  }

  return subApis;
}

export default function main() {
  const projectRoot = process.cwd();
  const entryFile = "src/index.ts";

  // 分析依赖（自动检测并处理 subFolderBatchRegister 模式）
  const graph = analyzeDependencies(entryFile, projectRoot);

  // 统计动态发现的文件
  const dynamicFiles = Object.entries(graph)
    .filter(([_, deps]) => deps.dynamic.length > 0)
    .flatMap(([_, deps]) => deps.dynamic);

  console.log("=== Analysis Summary ===");
  console.log(`Total files analyzed: ${Object.keys(graph).length}`);
  console.log(
    `Files with dynamic imports: ${Object.values(graph).filter((d) => d.dynamic.length > 0 || d.computed.length > 0).length}`
  );

  if (dynamicFiles.length > 0) {
    console.log("\n=== Dynamically Discovered Files ===");
    console.log("These files are loaded at runtime:");
    [...new Set(dynamicFiles)].forEach((dep) => console.log(`  - ${dep}`));
  }

  console.log("\n=== Files with Runtime Computed Imports ===");
  for (const [file, deps] of Object.entries(graph)) {
    if (deps.computed.length > 0) {
      console.log(`\n${file}:`);
      deps.computed.forEach((c) => console.log(`  - ${c}`));
    }
  }

  console.log("\n=== Full Dependency Graph ===");
  console.log(JSON.stringify(graph, null, 2));

  // 生成可视化
  // 生成 Mermaid 图
  function sanitizeId(str: string): string {
    // 替换所有特殊字符为下划线
    return str.replace(/[\/\\\.@\-:]/g, "_");
  }

  let mermaidContent = "graph LR\n";
  for (const [file, deps] of Object.entries(graph)) {
    const fileId = sanitizeId(file);

    // 静态导入 - 实线
    for (const dep of deps.static) {
      const depId = sanitizeId(dep);
      mermaidContent += `  ${fileId}["${file}"] --> ${depId}["${dep}"]\n`;
    }

    // 动态导入 - 虚线
    for (const dep of deps.dynamic) {
      const depId = sanitizeId(dep);
      mermaidContent += `  ${fileId}["${file}"] -.->|dynamic| ${depId}["${dep}"]\n`;
    }

    // 运行时计算的导入 - 红色虚线
    if (deps.computed.length > 0) {
      for (const computed of deps.computed) {
        const computedLabel = computed.replace(/:/g, " ");
        mermaidContent += `  ${fileId}["${file}"] -.->|"${computedLabel}"| COMPUTED[Runtime Computed]\n`;
      }
    }
  }

  // 添加样式
  mermaidContent +=
    "\n  classDef computed fill:#f96,stroke:#333,stroke-width:2px\n";
  mermaidContent += "  class COMPUTED computed\n";

  // 写入文件
  fs.writeFileSync("dependency-graph.mmd", mermaidContent);
  console.log("\n✅ Mermaid diagram written to: dependency-graph.mmd");
}

main();
