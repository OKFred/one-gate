import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * 动态执行 ES Module 脚本
 * @param code JS 脚本代码 (ESM 格式，须包含 export default 或 export async function run)
 * @param ctx 执行上下文，传入 { params, db }
 */
export async function executeJsScript(
  code: string,
  ctx: { params: any; db: any }
) {
  const isNode =
    typeof process !== "undefined" && process.versions && process.versions.node;

  if (isNode) {
    // ---- 1. Node.js 运行环境 ----
    // 使用 Data URL (Base64) 纯内存动态加载 ES Module，不写入任何本地文件。
    // 这可以完全避免 tsx --watch 监听到任何文件变更导致的服务器重启，且执行速度更快，零磁盘开销。
    try {
      const base64Code = Buffer.from(code).toString("base64");
      const dataUrl = `data:text/javascript;base64,${base64Code}`;
      const module = await import(dataUrl);

      let handler: Function | null = null;
      if (typeof module.default === "function") {
        handler = module.default;
      } else if (module.default && typeof module.default.run === "function") {
        handler = module.default.run;
      } else if (typeof module.run === "function") {
        handler = module.run;
      }

      if (!handler) {
        throw new Error("脚本未导出默认函数或 run() 函数");
      }

      return await handler(ctx);
    } catch (err: any) {
      throw new Error(`执行动态脚本出错: ${err.message || err}`);
    }
  } else {
    // ---- 2. Cloudflare Workers 运行环境 (只读文件系统) ----
    // 采用代码转译语法 + eval/new Function 执行机制。
    let transformed = code;

    // 正则转译：把 export default 替换为赋值给全局变量，使其成为合法 JS 表达式而非模块独有语法
    const exportDefaultRegex = /export\s+default\s+/;
    if (exportDefaultRegex.test(transformed)) {
      transformed = transformed.replace(
        exportDefaultRegex,
        "globalThis.__temp_script_export = "
      );
    } else {
      throw new Error(
        "Cloudflare Worker 模式下，脚本必须包含 'export default' 导出执行函数或对象"
      );
    }

    try {
      // 执行转译后的代码，将导出对象绑定到临时全局属性
      const evalFn = new Function(transformed);
      evalFn();

      const exported = (globalThis as any).__temp_script_export;
      delete (globalThis as any).__temp_script_export;

      let handler: Function | null = null;
      if (typeof exported === "function") {
        handler = exported;
      } else if (exported && typeof exported.run === "function") {
        handler = exported.run;
      }

      if (!handler) {
        throw new Error("动态脚本没有导出合法的函数或包含 run 方法的对象");
      }

      return await handler(ctx);
    } catch (err: any) {
      throw new Error(`执行动态脚本出错: ${err.message}`);
    }
  }
}
