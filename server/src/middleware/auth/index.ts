import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { tokenUtils } from "@/utils/token";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";

export interface AuthenticatedContext extends Context {
    user?: {
        userId: number;
        username: string;
        role: string;
        department: string;
    };
}

export const authMiddleware = async (c: AuthenticatedContext, next: Next) => {
    try {
        // 从Authorization header中获取token
        const authHeader = c.req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new HTTPException(httpStatusCode.UNAUTHORIZED as ContentfulStatusCode, {
                message: "未提供有效的认证token",
            });
        }
        
        const token = authHeader.substring(7); // 移除 "Bearer " 前缀
        const payload = tokenUtils.verifyToken(token);
        
        if (!payload) {
            throw new HTTPException(httpStatusCode.UNAUTHORIZED as ContentfulStatusCode, {
                message: "token无效或已过期",
            });
        }
        
        // 将用户信息添加到context中
        c.user = {
            userId: payload.userId,
            username: payload.username,
            role: payload.role,
            department: payload.department,
        };
        
        await next();
    } catch (error) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(httpStatusCode.UNAUTHORIZED as ContentfulStatusCode, {
            message: "认证失败",
        });
    }
};

// 角色权限检查中间件
export const roleMiddleware = (allowedRoles: string[]) => {
    return async (c: AuthenticatedContext, next: Next) => {
        if (!c.user) {
            throw new HTTPException(httpStatusCode.UNAUTHORIZED as ContentfulStatusCode, {
                message: "未认证用户",
            });
        }
        
        if (!allowedRoles.includes(c.user.role)) {
            throw new HTTPException(httpStatusCode.FORBIDDEN as ContentfulStatusCode, {
                message: "权限不足",
            });
        }
        
        await next();
    };
};
