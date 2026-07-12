/**
 * 系统 Schema 同步模块
 *
 * 将 schemaRegistry 中收集的所有 OpenAPI schema
 * 同步到 system_schema_form 数据库表（source='system'）。
 * 在服务启动并注册完所有路由后调用。
 */

import {
  getAllSchemas,
  getVersionHash,
} from "@hodor/core/utils/schemaRegistry";
import { schemaFormRepository } from "./repository";

/**
 * 同步系统 schema 到数据库
 * - 新增：插入 source='system' 的记录
 * - 更新：schema 内容变化时更新
 * - 清理：registry 中不存在的旧系统 schema 记录删除
 */
export async function syncSystemSchemas(): Promise<void> {
  const allSchemas = getAllSchemas();
  const schemaCount = allSchemas.size;

  if (schemaCount === 0) {
    console.log("[Schema Sync] 未检测到已注册的系统 schema，跳过同步。");
    return;
  }

  console.log(
    `[Schema Sync] 开始同步 ${schemaCount} 个系统 schema 到数据库...`
  );

  const activeCodes: string[] = [];
  let upsertCount = 0;

  for (const [name, schema] of allSchemas) {
    activeCodes.push(name);
    try {
      await schemaFormRepository.upsertSystemSchema({
        code: name,
        name: name,
        schemaData: JSON.stringify(schema),
      });
      upsertCount++;
    } catch (error) {
      console.error(`[Schema Sync] 同步 "${name}" 失败:`, error);
    }
  }

  // 清理不再存在的系统 schema
  try {
    await schemaFormRepository.deleteStaleSystemSchemas(activeCodes);
  } catch (error) {
    console.error("[Schema Sync] 清理过期系统 schema 失败:", error);
  }

  const version = getVersionHash();
  console.log(
    `[Schema Sync] 同步完成: ${upsertCount}/${schemaCount} 个 schema, 版本号: ${version}`
  );
}
