import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, ".env");

/**
 * 读取 .env 中的 REGISTRY_URL
 */
function getEnvRegistryUrl() {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^REGISTRY_URL=(.*)$/m);
    if (match) return match[1].trim();
  }
  return "";
}

/**
 * 保存新的 REGISTRY_URL 到 .env
 */
function saveEnvRegistryUrl(url) {
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf-8");
    if (content.match(/^REGISTRY_URL=/m)) {
      content = content.replace(/^REGISTRY_URL=.*$/m, `REGISTRY_URL=${url}`);
    } else {
      content += `\nREGISTRY_URL=${url}`;
    }
  } else {
    content = `REGISTRY_URL=${url}`;
  }
  fs.writeFileSync(envPath, content.trim() + "\n");
}

/**
 * 运行命令并继承标准输出
 */
async function runCommand(command, args, cwd = ".") {
  console.log(`\n🚀 运行命令: ${command} ${args.join(" ")} (在 ${cwd})`);
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", cwd, shell: true });
    child.on("close", (code) => resolve(code));
  });
}

/**
 * 入口函数
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const currentUrl = getEnvRegistryUrl();
  console.log("\n🐳 Docker 部署工具 (跨平台 TS 版)");
  console.log("-----------------------------------");

  const inputUrl = await rl.question(
    `请输入 Docker Registry 项目地址 [当前: ${currentUrl || "未设置"}]: `,
  );

  const registryUrl = inputUrl.trim() || currentUrl;

  if (!registryUrl) {
    console.error("❌ 必须提供 Registry URL！");
    process.exit(1);
  }

  // 保存最新的 URL
  saveEnvRegistryUrl(registryUrl);
  rl.close();

  console.log(`\n📦 即将构建并推送至: ${registryUrl}\n`);

  // 自动生成 VERSION 并注入 server/.env
  try {
    const { execSync } = await import("node:child_process");
    const version = execSync('git log -1 --format="%cd-%h" --date=format:"%Y%m%d%H%M%S"', { encoding: "utf-8" }).trim();
    if (version) {
      const envFilePath = path.resolve(__dirname, "server/.env");
      if (fs.existsSync(envFilePath)) {
        let envContent = fs.readFileSync(envFilePath, "utf-8");
        if (envContent.match(/^VERSION=/m)) {
          envContent = envContent.replace(/^VERSION=.*$/m, `VERSION=${version}`);
        } else {
          envContent = envContent.trimEnd() + `\nVERSION=${version}\n`;
        }
        fs.writeFileSync(envFilePath, envContent);
      }
      console.log(`📦 VERSION 已注入: ${version}`);
    }
  } catch (e) {
    console.warn("⚠️  无法生成 VERSION:", e.message);
  }

  const apps = [
    { name: "server", dir: "./server" },
    { name: "platform", dir: "./platform" },
  ];

  for (const app of apps) {
    const imageName = `${registryUrl}-${app.name}`;
    console.log(`\n🛠️  正在处理: ${app.name} -> ${imageName}`);

    // Build
    const buildCode = await runCommand(
      "docker",
      ["build", "-t", imageName, "."],
      app.dir,
    );
    if (buildCode !== 0) {
      console.error(`❌ ${app.name} 构建失败 (代码: ${buildCode})`);
      process.exit(1);
    }

    // Push
    const pushCode = await runCommand("docker", ["push", imageName]);
    if (pushCode !== 0) {
      console.error(`❌ ${app.name} 推送失败 (代码: ${pushCode})`);
      process.exit(1);
    }

    console.log(`✅ ${app.name} 处理完毕`);
  }

  // Docker Compose
  console.log("\n🚢 启动 Docker Compose...");
  const composeCode = await runCommand("docker", ["compose", "up", "-d"]);

  if (composeCode === 0) {
    console.log("\n✨ 部署成功！\n");
  } else {
    console.error(
      `\n⚠️  Compose 启动过程中可能存在问题 (代码: ${composeCode})`,
    );
  }
}

main().catch((err) => {
  console.error("🔥 执行过程中发生错误:", err);
  process.exit(1);
});
