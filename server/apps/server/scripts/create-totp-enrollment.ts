import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import QRCode from "qrcode";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(bytes: Uint8Array): string {
  let buffer = 0;
  let bits = 0;
  let encoded = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += BASE32_ALPHABET[(buffer >>> bits) & 31];
    }
  }
  if (bits > 0) encoded += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return encoded;
}

function readArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
}

function readExistingSecret(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const match = /^HODOR_TOTP_GATE_SECRET=([A-Z2-7]+)$/mu.exec(
    readFileSync(path, "utf8")
  );
  return match?.[1];
}

function upsertEnvironmentSecret(path: string, secret: string): void {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `HODOR_TOTP_GATE_SECRET=${secret}`;
  const next = /^HODOR_TOTP_GATE_SECRET=.*$/mu.test(existing)
    ? existing.replace(/^HODOR_TOTP_GATE_SECRET=.*$/gmu, line)
    : `${existing.trimEnd()}${existing.trim() ? "\n" : ""}${line}\n`;
  writeFileSync(path, next.replace(/\r\n/gu, "\n"), "utf8");
}

async function main(): Promise<void> {
  const environment = readArgument("environment") ?? "local";
  if (!/^[a-z0-9-]{1,32}$/u.test(environment)) {
    throw new Error(
      "Environment must contain only lowercase letters, digits, and hyphens"
    );
  }
  const outputDirectory = resolve(process.cwd(), "../../../.secrets");
  const secretPath = resolve(outputDirectory, `totp-gate.${environment}.env`);
  const htmlPath = resolve(outputDirectory, `totp-gate.${environment}.html`);
  mkdirSync(outputDirectory, { recursive: true });

  const rotate = process.argv.includes("--rotate");
  const existing = readExistingSecret(secretPath);
  const secret = existing && !rotate ? existing : encodeBase32(randomBytes(20));
  const issuer = "Hodor";
  const account = `${environment}-gate`;
  const otpauth = `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  const qrDataUrl = await QRCode.toDataURL(otpauth, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
  });
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hodor ${environment} TOTP</title>
  <style>
    body { font: 16px system-ui, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 20px; color: #172033; }
    main { border: 1px solid #d8deea; border-radius: 16px; padding: 28px; text-align: center; }
    img { width: 320px; max-width: 100%; }
    #code { font-size: 42px; letter-spacing: 8px; font-variant-numeric: tabular-nums; }
    .warning { color: #9b3c19; text-align: left; }
    code { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <h1>Hodor ${environment} 二次门禁</h1>
    <p class="warning">此文件包含生产密钥。仅离线打开，不要截图、上传或提交 Git。</p>
    <img src="${qrDataUrl}" alt="Authenticator enrollment QR code">
    <p>Microsoft Authenticator / 2FAS 扫码后，应显示 6 位、30 秒动态码。</p>
    <p><code>${secret}</code></p>
    <p id="code" aria-live="polite">------</p>
    <p id="remaining"></p>
  </main>
  <script>
    const secret = ${JSON.stringify(secret)};
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const decode = (value) => {
      let buffer = 0, bits = 0;
      const bytes = [];
      for (const character of value) {
        buffer = (buffer << 5) | alphabet.indexOf(character);
        bits += 5;
        if (bits >= 8) { bits -= 8; bytes.push((buffer >>> bits) & 255); }
      }
      return new Uint8Array(bytes);
    };
    const update = async () => {
      const seconds = Math.floor(Date.now() / 1000);
      const step = Math.floor(seconds / 30);
      const counter = new Uint8Array(8);
      new DataView(counter.buffer).setBigUint64(0, BigInt(step), false);
      const key = await crypto.subtle.importKey("raw", decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
      const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, counter));
      const offset = digest[digest.length - 1] & 15;
      const binary = ((digest[offset] & 127) << 24) | ((digest[offset + 1] & 255) << 16) | ((digest[offset + 2] & 255) << 8) | (digest[offset + 3] & 255);
      document.querySelector("#code").textContent = String(binary % 1000000).padStart(6, "0");
      document.querySelector("#remaining").textContent = (30 - (seconds % 30)) + " 秒后更新";
    };
    update();
    setInterval(update, 1000);
  </script>
</body>
</html>
`;

  writeFileSync(secretPath, `HODOR_TOTP_GATE_SECRET=${secret}\n`, "utf8");
  writeFileSync(htmlPath, html, "utf8");
  const syncedDevVars = process.argv.includes("--sync-dev-vars");
  if (syncedDevVars) {
    upsertEnvironmentSecret(resolve(process.cwd(), ".dev.vars"), secret);
  }
  const fingerprint = createHash("sha256")
    .update(Buffer.from(secret, "utf8"))
    .digest("hex")
    .slice(0, 12);
  console.log(
    JSON.stringify({
      event: "totp.enrollment.created",
      environment,
      reusedExistingSecret: Boolean(existing),
      syncedDevVars,
      fingerprint,
      secretPath,
      htmlPath,
    })
  );
}

void main();
