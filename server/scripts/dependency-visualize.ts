import process from "process";
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

// 缓存已解析的路径
const pathCache = new Map<string, string | null>();

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

    traverseFunc(ast, {
      // 静态 import
      ImportDeclaration(pathNode: any) {
        result.static.push(pathNode.node.source.value);
      },

      // require() 和 import()
      CallExpression(nodePath: any) {
        const { callee, arguments: args } = nodePath.node;

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
  } catch (error) {
    console.error(`Parse error in ${filePath}:`, error);
  }

  return result;
}

function shouldAnalyzeFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith("src/api/")) {
    if (normalized.startsWith("src/api/system/auth/")) {
      return true;
    }
    const parts = normalized.split("/");
    const dirParts = parts.slice(0, -1);
    if (dirParts.length > 3) {
      return false;
    }
  }
  return true;
}

function resolveImportPath(
  importPath: string,
  currentFilePath: string,
  projectRoot: string
): string | null {
  const cacheKey = `${currentFilePath}:${importPath}`;
  if (pathCache.has(cacheKey)) return pathCache.get(cacheKey)!;

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
    pathCache.set(cacheKey, null);
    return null;
  }

  const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];

  for (const ext of extensions) {
    const testPath = resolvedPath + ext;
    if (fs.existsSync(testPath)) {
      const result = path.relative(projectRoot, testPath).replace(/\\/g, "/");
      pathCache.set(cacheKey, result);
      return result;
    }
  }

  if (fs.existsSync(resolvedPath)) {
    const result = path.relative(projectRoot, resolvedPath).replace(/\\/g, "/");
    pathCache.set(cacheKey, result);
    return result;
  }

  pathCache.set(cacheKey, null);
  return null;
}

function analyzeDependencies(
  entryFiles: string[],
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

    if (!shouldAnalyzeFile(filePath)) {
      if (!graph[filePath]) {
        graph[filePath] = { static: [], dynamic: [], computed: [] };
      }
      return;
    }

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
        const pattern = computed.replace("template:", "").replace("*", "");
        const dir = path.dirname(
          path.resolve(path.dirname(absolutePath), pattern)
        );
        if (fs.existsSync(dir)) {
          const possibleFiles = findPossibleImports(dir, projectRoot);
          possibleFiles.forEach((file) => analyzeFile(file));
        }
      }
    }
  }

  entryFiles.forEach((entry) => analyzeFile(entry));
  return graph;
}

function findPossibleImports(dir: string, projectRoot: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const indexPath = path.join(fullPath, "index.ts");
      if (fs.existsSync(indexPath)) {
        const relativePath = path.relative(projectRoot, indexPath);
        files.push(relativePath.replace(/\\/g, "/"));
      }
    } else if (item.match(/\.(ts|js|tsx|jsx)$/)) {
      const relativePath = path.relative(projectRoot, fullPath);
      files.push(relativePath.replace(/\\/g, "/"));
    }
  }

  return files;
}

function sanitizeId(str: string): string {
  return str.replace(/[\/\\\.@\-:]/g, "_");
}

export default function main() {
  const projectRoot = process.cwd();
  // 支持多个入口点
  const entryFiles = ["src/node.ts" /* , "src/worker.ts" */].filter((f) =>
    fs.existsSync(path.resolve(projectRoot, f))
  );

  console.log(`Analyzing entry points: ${entryFiles.join(", ")}`);
  const graph = analyzeDependencies(entryFiles, projectRoot);

  console.log("=== Analysis Summary ===");
  console.log(`Total files analyzed: ${Object.keys(graph).length}`);

  function getCollapsedNode(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.startsWith("src/api/")) {
      const parts = normalized.split("/");
      if (parts.length > 3) {
        if (parts[2] === "system" && parts[3] === "auth") {
          return `src/api/system/auth`;
        }
        return `src/api/${parts[2]}`;
      }
    }
    const dir = path.dirname(filePath).replace(/\\/g, "/");
    if (dir === "." || dir === "src" || dir === "") {
      return filePath;
    }
    return dir;
  }

  class DAGBuilder {
    private adjacencyList: Map<string, Set<string>> = new Map();

    public tryAddEdge(from: string, to: string): boolean {
      if (from === to) return false;
      if (this.hasPath(to, from)) {
        return false; // Adding this edge would form a cycle
      }
      if (!this.adjacencyList.has(from)) {
        this.adjacencyList.set(from, new Set());
      }
      this.adjacencyList.get(from)!.add(to);
      return true;
    }

    private hasPath(
      start: string,
      target: string,
      visited: Set<string> = new Set()
    ): boolean {
      if (start === target) return true;
      visited.add(start);
      const neighbors = this.adjacencyList.get(start);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (this.hasPath(neighbor, target, visited)) return true;
          }
        }
      }
      return false;
    }
  }

  function generateMermaid(isDetailed: boolean): string {
    const dag = new DAGBuilder();

    if (isDetailed) {
      const groups: { [dir: string]: string[] } = {};
      for (const file of Object.keys(graph)) {
        const dir = path.dirname(file).replace(/\\/g, "/");
        if (!groups[dir]) groups[dir] = [];
        groups[dir].push(file);
      }

      let mermaidContent = `---
config:
  theme: neo-dark
  layout: elk
---
graph LR
`;

      for (const [dir, files] of Object.entries(groups)) {
        if (dir === "." || dir === "") {
          for (const file of files) {
            const fileId = sanitizeId(file);
            mermaidContent += `  ${fileId}["${file}"]\n`;
          }
          continue;
        }

        const dirId = sanitizeId(dir);
        mermaidContent += `  subgraph ${dirId} ["${dir}/"]\n`;
        for (const file of files) {
          const fileId = sanitizeId(file);
          mermaidContent += `    ${fileId}["${path.basename(file)}"]\n`;
        }
        mermaidContent += `  end\n`;
      }

      for (const [file, deps] of Object.entries(graph)) {
        const fileId = sanitizeId(file);

        for (const dep of deps.static) {
          const depId = sanitizeId(dep);
          if (dag.tryAddEdge(file, dep)) {
            mermaidContent += `  ${fileId} --> ${depId}\n`;
          }
        }

        for (const dep of deps.dynamic) {
          const depId = sanitizeId(dep);
          if (dag.tryAddEdge(file, dep)) {
            mermaidContent += `  ${fileId} -.->|dynamic| ${depId}\n`;
          }
        }

        if (deps.computed.length > 0) {
          for (const computed of deps.computed) {
            const label = computed.replace(/:/g, " ");
            mermaidContent += `  ${fileId} -.->|"${label}"| COMPUTED[Runtime Computed]\n`;
          }
        }
      }

      mermaidContent +=
        "\n  classDef entry fill:#2d5,stroke:#333,stroke-width:4px\n";
      mermaidContent +=
        "  classDef computed fill:#f96,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5\n";

      entryFiles.forEach((f) => {
        mermaidContent += `  class ${sanitizeId(f)} entry\n`;
      });
      mermaidContent += "  class COMPUTED computed\n";

      return mermaidContent;
    } else {
      const collapsedNodes: {
        [node: string]: {
          label: string;
          isFolder: boolean;
          static: Set<string>;
          dynamic: Set<string>;
          computed: Set<string>;
        };
      } = {};

      for (const file of Object.keys(graph)) {
        const node = getCollapsedNode(file);
        if (!collapsedNodes[node]) {
          const isFolder = node !== file;
          collapsedNodes[node] = {
            label: isFolder ? `${path.basename(node)}/` : path.basename(node),
            isFolder,
            static: new Set(),
            dynamic: new Set(),
            computed: new Set(),
          };
        }

        const deps = graph[file];
        for (const dep of deps.static) {
          const depNode = getCollapsedNode(dep);
          if (depNode !== node) {
            collapsedNodes[node].static.add(depNode);
          }
        }
        for (const dep of deps.dynamic) {
          const depNode = getCollapsedNode(dep);
          if (depNode !== node) {
            collapsedNodes[node].dynamic.add(depNode);
          }
        }
        for (const comp of deps.computed) {
          collapsedNodes[node].computed.add(comp);
        }
      }

      const groups: { [parentDir: string]: string[] } = {};
      for (const node of Object.keys(collapsedNodes)) {
        const parentDir = path.dirname(node).replace(/\\/g, "/");
        if (!groups[parentDir]) groups[parentDir] = [];
        groups[parentDir].push(node);
      }

      let mermaidContent = `---
config:
  theme: neo-dark
  layout: elk
---
graph LR
`;

      for (const [parentDir, nodes] of Object.entries(groups)) {
        if (parentDir === "." || parentDir === "") {
          for (const node of nodes) {
            const nodeId = sanitizeId(node);
            const info = collapsedNodes[node];
            mermaidContent += `  ${nodeId}["${info.label}"]\n`;
          }
          continue;
        }

        const dirId = sanitizeId(parentDir);
        mermaidContent += `  subgraph ${dirId} ["${parentDir}/"]\n`;
        for (const node of nodes) {
          const nodeId = sanitizeId(node);
          const info = collapsedNodes[node];
          mermaidContent += `    ${nodeId}["${info.label}"]\n`;
        }
        mermaidContent += `  end\n`;
      }

      for (const [node, info] of Object.entries(collapsedNodes)) {
        const nodeId = sanitizeId(node);

        for (const dep of info.static) {
          const depId = sanitizeId(dep);
          if (dag.tryAddEdge(node, dep)) {
            mermaidContent += `  ${nodeId} --> ${depId}\n`;
          }
        }

        for (const dep of info.dynamic) {
          const depId = sanitizeId(dep);
          if (dag.tryAddEdge(node, dep)) {
            mermaidContent += `  ${nodeId} -.->|dynamic| ${depId}\n`;
          }
        }

        if (info.computed.size > 0) {
          for (const computed of info.computed) {
            const label = computed.replace(/:/g, " ");
            mermaidContent += `  ${nodeId} -.->|"${label}"| COMPUTED[Runtime Computed]\n`;
          }
        }
      }

      mermaidContent +=
        "\n  classDef entry fill:#2d5,stroke:#333,stroke-width:4px\n";
      mermaidContent +=
        "  classDef computed fill:#f96,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5\n";

      entryFiles.forEach((f) => {
        const collapsedEntry = getCollapsedNode(f);
        mermaidContent += `  class ${sanitizeId(collapsedEntry)} entry\n`;
      });
      mermaidContent += "  class COMPUTED computed\n";

      return mermaidContent;
    }
  }

  function updateReadme(readmePath: string, mermaidCode: string) {
    if (!fs.existsSync(readmePath)) return;
    let content = fs.readFileSync(readmePath, "utf-8");
    const startMarker = "<!-- DEPENDENCY_GRAPH_START -->";
    const endMarker = "<!-- DEPENDENCY_GRAPH_END -->";
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      const before = content.substring(0, startIndex + startMarker.length);
      const after = content.substring(endIndex);
      const newGraph = `\n\`\`\`mermaid\n${mermaidCode}\`\`\`\n`;
      content = before + newGraph + after;
      fs.writeFileSync(readmePath, content, "utf-8");
      console.log(`✅ Embedded dependency graph into: ${readmePath}`);
    }
  }

  const compactContent = generateMermaid(false);

  updateReadme("./README.md", compactContent);
  updateReadme("./README_zh_CN.md", compactContent);
}

main();
