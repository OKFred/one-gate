import crypto from "crypto";

// 临时使用简单的token生成，生产环境建议使用JWT
const JWT_SECRET = process.env.JWT_SECRET;
!JWT_SECRET && console.error("❌.MISSING ENV: JWT_SECRET");

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
      .createHmac("sha256", JWT_SECRET)
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
        .createHmac("sha256", JWT_SECRET)
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
