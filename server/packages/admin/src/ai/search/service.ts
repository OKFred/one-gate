import { type FromSchema } from "json-schema-to-ts";
import { SearchReq, SearchRes } from "./model";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { initialMenuData } from "@hodor/core/db/initMenu";
import { runAiChat, runAiEmbedding } from "../driver";

/**
 * Interface representing internal indexable item for search.
 */
interface IndexItem {
  id: string;
  title: string;
  type: "menu" | "config" | "feature" | "system";
  path?: string;
  description: string;
  keywords: string[];
}

/**
 * Collect all indexable system entries for global search.
 */
function getSystemIndexItems(): IndexItem[] {
  const items: IndexItem[] = initialMenuData
    .filter((m) => m.path)
    .map((m) => ({
      id: `menu_${m.id}`,
      title: m.name,
      type: "menu" as const,
      path: m.path || undefined,
      description: `系统页面导航 ${m.name} (${m.path})`,
      keywords: [m.name, m.path || "", m.business || ""],
    }));

  items.push(
    {
      id: "sys_ai_config",
      title: "AI 模型供应商配置",
      type: "config",
      path: "/ai/config",
      description: "配置管理 LLM 供应商、API Key、模型名称与连通性测试",
      keywords: [
        "AI",
        "LLM",
        "OpenAI",
        "DeepSeek",
        "Cloudflare",
        "Workers AI",
        "配置",
      ],
    },
    {
      id: "sys_oss_config",
      title: "OSS 对象存储配置",
      type: "config",
      path: "/oss/config",
      description: "管理 Cloudflare R2、S3 等对象存储 Bucket 配置",
      keywords: ["OSS", "R2", "S3", "存储", "Bucket"],
    },
    {
      id: "sys_cron_task",
      title: "系统定时任务",
      type: "feature",
      path: "/maintenance/cron",
      description: "查看和配置后台定时 Cron 任务调度与运行状态",
      keywords: ["Cron", "定时任务", "Scheduler"],
    },
    {
      id: "sys_log_view",
      title: "系统运行日志",
      type: "system",
      path: "/base/log",
      description: "审计系统操作日志与登录访问历史",
      keywords: ["日志", "Log", "审计", "登录"],
    }
  );

  return items;
}

/**
 * Process global search query using hybrid keyword matching and Workers AI embeddings.
 */
async function onSearch(
  params: FromSchema<typeof SearchReq>
): Promise<FromSchema<typeof SearchRes>> {
  const { query, limit = 10 } = params;
  const cleanedQuery = query.trim().toLowerCase();

  if (!cleanedQuery) {
    return { list: [], total: 0 };
  }

  const indexItems = getSystemIndexItems();

  // 1. 基础关键字与模糊匹配评分
  const scoredItems = indexItems.map((item) => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const descLower = item.description.toLowerCase();

    if (titleLower === cleanedQuery) score += 100;
    else if (titleLower.includes(cleanedQuery)) score += 50;

    if (descLower.includes(cleanedQuery)) score += 20;

    for (const kw of item.keywords) {
      if (kw.toLowerCase().includes(cleanedQuery)) score += 15;
    }

    return { item, score };
  });

  // 排序筛选候选
  let results = scoredItems
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  // 2. 若完全匹配结果较少，尝试使用 AI 进行自然语言语义推导
  if (results.length < 3) {
    try {
      const prompt = `用户在管理后台搜索: "${query}"。
现有系统选项:
${indexItems.map((i, idx) => `${idx + 1}. [${i.title}] (路径: ${i.path || "无"}) - ${i.description}`).join("\n")}

请从列表中挑选最匹配的 1-3 个序号，仅按 JSON 数组格式返回序号，例如: [1, 3]`;

      const aiRes = await runAiChat({
        model: "@cf/meta/llama-3.2-3b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const matchedIndexes: number[] = JSON.parse(
        aiRes.content.replace(/```json|```/g, "").trim()
      );

      for (const idx of matchedIndexes) {
        const item = indexItems[idx - 1];
        if (item && !results.some((r) => r.item.id === item.id)) {
          results.push({ item, score: 30 });
        }
      }
    } catch {
      // 忽略 AI 智能重排异常，回退纯关键字结果
    }
  }

  const list = results.slice(0, limit).map(({ item, score }) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    path: item.path,
    score,
    description: item.description,
    snippet: `发现匹配项: ${item.title} (${item.type})`,
  }));

  return {
    list,
    total: list.length,
  };
}

const searchApi = {
  req: SearchReq,
  res: SearchRes,
  pathInfo: { path: "/search", method: "post", summary: "全局 AI 智能搜索" },
  adapter: bodyAdapter,
  service: onSearch,
  permission: { action: "read" },
} satisfies API;

export default {
  search: searchApi,
};
