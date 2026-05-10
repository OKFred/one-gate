import { DOMParser as XMLDOMParser } from "xmldom";

let polyfilled = false;

/**
 * 为 AWS SDK v3 提供浏览器兼容性模拟。
 * Cloudflare Workers 环境缺少 DOMParser 和 Node 常量，这会导致 AWS SDK 解析 XML 响应时报错。
 */
export function applyAwsPolyfills() {
  if (polyfilled) return;

  if (!(globalThis as any).DOMParser) {
    (globalThis as any).DOMParser = XMLDOMParser as any;
  }

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

  polyfilled = true;
}
