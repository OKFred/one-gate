import crypto from "crypto";
import { getEnv } from "./env";

// 动态获取 JWT_SECRET，避免在 Cloudflare Workers 启动加载时 env 还未注入的问题
function getJwtSecret(): string {
  const secret = getEnv("JWT_SECRET");
  if (!secret) {
    console.error("❌.MISSING ENV: JWT_SECRET");
    return "";
  }
  return secret;
}

export interface TokenPayload {
  userId: number;
  username: string;
  exp: number; // 过期时间戳
}

export const tokenUtils = {
  // 生成token
  generateToken(payload: Omit<TokenPayload, "exp">): string {
    const exp = Date.now() + 24 * 60 * 60 * 1000; // 24小时后过期
    const tokenPayload: TokenPayload = {
      ...payload,
      exp,
    };

    // 简单的token实现，生产环境建议使用JWT
    const tokenData = JSON.stringify(tokenPayload);
    const signature = crypto
      .createHmac("sha256", getJwtSecret())
      .update(tokenData)
      .digest("hex");

    const token = Buffer.from(tokenData).toString("base64") + "." + signature;
    return token;
  },

  // 验证token
  verifyToken(token: string): TokenPayload | null {
    try {
      const [encodedData, signature] = token.split(".");
      if (!encodedData || !signature) return null;

      const tokenData = Buffer.from(encodedData, "base64").toString();
      const expectedSignature = crypto
        .createHmac("sha256", getJwtSecret())
        .update(tokenData)
        .digest("hex");

      if (signature !== expectedSignature) return null;

      const payload: TokenPayload = JSON.parse(tokenData);

      // 检查是否过期
      if (payload.exp < Date.now()) return null;

      return payload;
    } catch (error) {
      return null;
    }
  },

  // 刷新token
  refreshToken(oldToken: string): string | null {
    const payload = this.verifyToken(oldToken);
    if (!payload) return null;

    return this.generateToken({
      userId: payload.userId,
      username: payload.username,
    });
  },
};
