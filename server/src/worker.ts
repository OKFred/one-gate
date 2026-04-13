import { DOMParser } from "xmldom";

// 为 AWS SDK v3 提供完整的浏览器兼容性模拟
// Cloudflare Workers 环境缺少 DOMParser 和 Node 常量，这会导致 AWS SDK 解析 XML 响应时报错
if (!globalThis.DOMParser) {
  const xmldom = new DOMParser();
  globalThis.DOMParser = DOMParser as any;

  // 模拟 Node 常量 (AWS SDK XML 解析器需要判断 Node.ELEMENT_NODE)
  if (!(globalThis as any).Node) {
    (globalThis as any).Node = {
      ELEMENT_NODE: 1,
      ATTRIBUTE_NODE: 2,
      TEXT_NODE: 3,
      CDATA_SECTION_NODE: 4,
      ENTITY_REFERENCE_NODE: 5,
      ENTITY_NODE: 6,
      PROCESSING_INSTRUCTION_NODE: 7,
      COMMENT_NODE: 8,
      DOCUMENT_NODE: 9,
      DOCUMENT_TYPE_NODE: 10,
      DOCUMENT_FRAGMENT_NODE: 11,
      NOTATION_NODE: 12,
    };
  }
}

import createApp from "@/server/index";
import { setD1Binding } from "@/db/index";
import { setEnv } from "@/utils/env";

let app: any = null;

export default {
  /**
   * Cloudflare Workers fetch handler.
   */
  async fetch(request: Request, env: any, ctx: any) {
    // 1. Inject bindings into the database layer
    if (env.DB) {
      setD1Binding(env.DB);
    }

    // 2. Set environment variables globally
    setEnv(env);

    // 3. Initialize the app instance as a singleton
    if (!app) {
      app = createApp();
    }

    // 4. Handle the request via Hono
    return app.fetch(request, env, ctx);
  },
};
