// @ts-nocheck
/**
 * 缓存抽象层测试
 * 运行: npx tsx test/cache/kv.test.ts
 */

import { kv } from "../../src/middleware/cache/index";

/**
 * 测试基础功能
 */
async function testBasicOperations() {
  console.log("\n=== 测试基础功能 ===\n");

  // 1. 存储和读取字符串
  console.log("1. 测试字符串存储和读取");
  await kv.put("test:string", "hello world", { expirationTtl: 60 });
  const stringValue = await kv.get("test:string");
  console.log(`  存储: "hello world"`);
  console.log(`  读取: "${stringValue}"`);
  console.assert(stringValue === "hello world", "❌ 字符串测试失败");
  console.log("  ✅ 字符串测试通过\n");

  // 2. 存储和读取 JSON
  console.log("2. 测试 JSON 存储和读取");
  const testObject = { name: "张三", age: 30, roles: ["admin", "user"] };
  await kv.put("test:json", testObject, { expirationTtl: 60 });
  const jsonValue = await kv.get<typeof testObject>("test:json", "json");
  console.log(`  存储:`, testObject);
  console.log(`  读取:`, jsonValue);
  console.assert(jsonValue?.name === "张三", "❌ JSON 测试失败");
  console.log("  ✅ JSON 测试通过\n");

  // 3. 测试不存在的键
  console.log("3. 测试不存在的键");
  const nullValue = await kv.get("test:notexist");
  console.log(`  读取不存在的键: ${nullValue}`);
  console.assert(nullValue === null, "❌ null 测试失败");
  console.log("  ✅ null 测试通过\n");

  // 4. 测试删除
  console.log("4. 测试删除");
  await kv.put("test:delete", "to be deleted");
  let value = await kv.get("test:delete");
  console.log(`  删除前: "${value}"`);
  await kv.del("test:delete");
  value = await kv.get("test:delete");
  console.log(`  删除后: ${value}`);
  console.assert(value === null, "❌ 删除测试失败");
  console.log("  ✅ 删除测试通过\n");
}

/**
 * 测试 TTL 过期
 */
async function testTTL() {
  console.log("\n=== 测试 TTL 过期 ===\n");

  console.log("设置缓存，2 秒后过期");
  await kv.put("test:ttl", "expire soon", { expirationTtl: 2 });

  console.log("立即读取:");
  let value = await kv.get("test:ttl");
  console.log(`  值: "${value}"`);

  console.log("等待 3 秒...");
  await sleep(3000);

  console.log("3 秒后读取:");
  value = await kv.get("test:ttl");
  console.log(`  值: ${value}`);
  console.assert(value === null, "❌ TTL 测试失败");
  console.log("  ✅ TTL 测试通过\n");
}

/**
 * 测试list功能
 */
async function testListOperations() {
  console.log("\n=== 测试 list() 功能 ===\n");

  // 写入测试数据
  await kv.put("user:1:name", "Alice");
  await kv.put("user:2:name", "Bob");
  await kv.put("product:1:name", "Apple");
  await kv.put("product:2:name", "Banana");

  // 列出所有键
  console.log("1. 列出所有键:");
  const allKeys = await kv.list({ limit: 100 });
  console.log(`  总共 ${allKeys.keys.length} 个键`);
  allKeys.keys.forEach((k) => console.log(`    - ${k.name}`));

  // 按前缀过滤
  console.log("\n2. 按前缀过滤 (user:):");
  const userKeys = await kv.list({ prefix: "user:", limit: 100 });
  console.log(`  找到 ${userKeys.keys.length} 个用户键`);
  userKeys.keys.forEach((k) => console.log(`    - ${k.name}`));

  console.assert(allKeys.keys.length >= 4, "❌ 总键数错误");
  console.assert(userKeys.keys.length === 2, "❌ 用户键数错误");
  console.log("  ✅ list() 测试通过\n");
}

/**
 * 性能测试
 */
async function testPerformance() {
  console.log("\n=== 性能测试 ===\n");

  const iterations = 1000;

  // 写入性能
  console.log(`写入 ${iterations} 个缓存项...`);
  const writeStart = Date.now();
  const writePromises = [];
  for (let i = 0; i < iterations; i++) {
    writePromises.push(kv.put(`perf:key${i}`, `value${i}`));
  }
  await Promise.all(writePromises);
  const writeTime = Date.now() - writeStart;
  console.log(
    `  耗时: ${writeTime}ms (平均 ${(writeTime / iterations).toFixed(3)}ms/次)\n`
  );

  // 读取性能
  console.log(`读取 ${iterations} 个缓存项...`);
  const readStart = Date.now();
  const readPromises = [];
  for (let i = 0; i < iterations; i++) {
    readPromises.push(kv.get(`perf:key${i}`));
  }
  await Promise.all(readPromises);
  const readTime = Date.now() - readStart;
  console.log(
    `  耗时: ${readTime}ms (平均 ${(readTime / iterations).toFixed(3)}ms/次)\n`
  );

  console.log("  ✅ 性能测试完成\n");
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log("🧪 开始测试缓存抽象层 (全局单实例)\n");
  console.log("=".repeat(50));

  try {
    // 先清空测试数据（谨慎使用，这里假设是测试环境）
    // await kv.clear();

    await testBasicOperations();
    await testTTL();
    await testListOperations();
    await testPerformance();

    console.log("=".repeat(50));
    console.log("\n✅ 所有测试通过！\n");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

// 辅助函数
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 运行测试
runAllTests();
