import { HTTPException } from "hono/http-exception";
import { tokenUtils } from "@/utils/token";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { LanguageKey } from "@/types/locales";
import { NodeHonoContext } from "@/types/app";
import db from "@/db/index";
import { userTable } from "@/api/system/user/db.table";
import { eq } from "drizzle-orm";

export const authMiddleware = async (c: NodeHonoContext) => {
  try {
    // 从Authorization header中获取token
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(
        httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
        {
          message: "i18n.api.system.noToken" satisfies LanguageKey,
        }
      );
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    const payload = tokenUtils.verifyToken(token);

    if (!payload) {
      throw new HTTPException(
        httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
        {
          message: "i18n.api.system.invalidToken" satisfies LanguageKey,
        }
      );
    }

    // 从数据库获取最新的用户信息
    const userArr = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, payload.userId))
      .limit(1);

    if (userArr.length === 0) {
      throw new HTTPException(
        httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
        {
          message: "i18n.api.system.authFailed" satisfies LanguageKey,
        }
      );
    }

    const user = userArr[0];

    if (!user.isEnabled) {
      throw new HTTPException(
        httpStatusCode.FORBIDDEN as ContentfulStatusCode,
        {
          message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
        }
      );
    }

    // 将用户信息添加到context中
    c.set("userObj", {
      userId: user.id,
      ...user,
      password: undefined, // 不暴露密码
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(
      httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
      {
        message: "i18n.api.system.authFailed" satisfies LanguageKey,
      }
    );
  }
};

// 角色权限检查中间件
export const roleMiddleware = (allowedRoles: number[]) => {
  return async (c: NodeHonoContext) => {
    if (!c.get("userObj")) {
      throw new HTTPException(
        httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
        {
          message: "i18n.api.system.notAuthenticated" satisfies LanguageKey,
        }
      );
    }

    if (
      !allowedRoles.some((role) =>
        c.get("userObj").roleArr.find((r) => r.value === role)
      )
    ) {
      throw new HTTPException(
        httpStatusCode.FORBIDDEN as ContentfulStatusCode,
        {
          message:
            "i18n.api.system.insufficientPermission" satisfies LanguageKey,
        }
      );
    }
  };
};
