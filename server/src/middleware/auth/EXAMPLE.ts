/**
 * 权限中间件使用示例
 * 演示如何在实际 API 中使用权限校验
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@/types/app";
import { authMiddleware } from "@/middleware/auth";
import {
  checkPermission,
  checkApiPermission,
  checkRole,
  hasResourcePermission,
  filterMenusByPermissions,
  hasButtonPermission,
} from "@/middleware/auth/rbac";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";

const app = new OpenAPIHono<AppBindings>();

// ============================================================
// 示例 1: 基础权限检查
// ============================================================

// 所有 /api/example/* 路由都需要认证
app.use("/api/example/*", authMiddleware);

// 查看列表 - 需要读权限
app.get("/api/example/list", checkPermission("example:read"), async (c) => {
  const userObj = c.var.userObj;
  return c.json({
    message: "你有权限查看列表",
    userId: userObj.userId,
  });
});

// 创建 - 需要写权限
app.post("/api/example/create", checkPermission("example:write"), async (c) => {
  const userObj = c.var.userObj;
  const body = await c.req.json();

  return c.json({
    message: "创建成功",
    data: body,
  });
});

// 删除 - 需要删除权限
app.delete(
  "/api/example/delete/:id",
  checkPermission("example:delete"),
  async (c) => {
    const id = c.req.param("id");
    return c.json({ message: `删除成功: ${id}` });
  }
);

// ============================================================
// 示例 2: 多权限检查（或关系）
// ============================================================

// 编辑 - 需要 example:write 或 example:admin 权限（满足其一即可）
app.put(
  "/api/example/edit/:id",
  checkPermission(["example:write", "example:admin"]),
  async (c) => {
    const id = c.req.param("id");
    return c.json({ message: `编辑成功: ${id}` });
  }
);

// ============================================================
// 示例 3: 多权限检查（且关系）
// ============================================================

// 批量删除 - 需要同时拥有 example:delete 和 example:admin 权限
app.post(
  "/api/example/batch-delete",
  checkPermission(["example:delete", "example:admin"], true),
  async (c) => {
    const body = await c.req.json();
    return c.json({ message: "批量删除成功", count: body.ids?.length });
  }
);

// ============================================================
// 示例 4: 角色检查
// ============================================================

// 只允许管理员角色访问
app.get("/api/example/admin-only", checkRole([1]), async (c) => {
  return c.json({ message: "管理员专用接口" });
});

// 允许多个角色访问
app.get("/api/example/managers", checkRole([1, 2, 3]), async (c) => {
  return c.json({ message: "管理层接口" });
});

// ============================================================
// 示例 5: 资源级权限（只能操作自己的资源）
// ============================================================

interface Document {
  id: number;
  title: string;
  content: string;
  creatorId: number;
}

// 模拟数据库
const documents: Document[] = [
  { id: 1, title: "文档1", content: "内容1", creatorId: 1 },
  { id: 2, title: "文档2", content: "内容2", creatorId: 2 },
  { id: 3, title: "文档3", content: "内容3", creatorId: 1 },
];

// 查看文档 - 只能看自己的或有 all 权限
app.get(
  "/api/example/documents/:id",
  checkPermission("document:read"),
  async (c) => {
    const userObj = c.var.userObj;
    const id = parseInt(c.req.param("id"));

    const doc = documents.find((d) => d.id === id);
    if (!doc) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
    }

    // 检查资源级权限
    if (!hasResourcePermission(userObj, "document:read", doc.creatorId)) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    return c.json(doc);
  }
);

// 编辑文档 - 只能编辑自己的
app.put(
  "/api/example/documents/:id",
  checkPermission("document:write"),
  async (c) => {
    const userObj = c.var.userObj;
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();

    const doc = documents.find((d) => d.id === id);
    if (!doc) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
    }

    // 检查资源级权限
    if (!hasResourcePermission(userObj, "document:write", doc.creatorId)) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    // 执行更新
    Object.assign(doc, body);
    return c.json({ message: "更新成功", data: doc });
  }
);

// ============================================================
// 示例 6: 列表过滤（只返回有权限的资源）
// ============================================================

app.get(
  "/api/example/documents",
  checkPermission("document:read"),
  async (c) => {
    const userObj = c.var.userObj;

    // 根据权限过滤文档列表
    const filtered = documents.filter((doc) =>
      hasResourcePermission(userObj, "document:read", doc.creatorId)
    );

    return c.json({
      total: filtered.length,
      list: filtered,
    });
  }
);

// ============================================================
// 示例 7: 获取菜单（根据权限过滤）
// ============================================================

interface Menu {
  id: number;
  name: string;
  path: string;
  children?: Menu[];
}

const allMenus: Menu[] = [
  {
    id: 1,
    name: "仪表盘",
    path: "/dashboard",
  },
  {
    id: 2,
    name: "系统管理",
    path: "/system",
    children: [
      { id: 3, name: "用户管理", path: "/system/user" },
      { id: 4, name: "角色管理", path: "/system/role" },
      { id: 5, name: "权限管理", path: "/system/permission" },
    ],
  },
];

app.get("/api/example/menus", authMiddleware, async (c) => {
  const userObj = c.var.userObj;

  // 根据用户权限过滤菜单
  const userMenus = filterMenusByPermissions(allMenus, userObj.permissions);

  return c.json(userMenus);
});

// ============================================================
// 示例 8: 获取页面数据（包含按钮权限）
// ============================================================

app.get("/api/example/page-data", checkPermission("user:read"), async (c) => {
  const userObj = c.var.userObj;

  // 模拟获取数据
  const users = [
    { id: 1, name: "用户1" },
    { id: 2, name: "用户2" },
  ];

  // 检查按钮权限
  const permissions = {
    canAdd: hasButtonPermission(userObj.permissions, "button:user:add"),
    canEdit: hasButtonPermission(userObj.permissions, "button:user:edit"),
    canDelete: hasButtonPermission(userObj.permissions, "button:user:delete"),
    canExport: hasButtonPermission(userObj.permissions, "button:user:export"),
  };

  return c.json({
    data: users,
    permissions,
  });
});

// ============================================================
// 示例 9: 自动 API 权限检查
// ============================================================

// 创建一个子应用，使用自动 API 权限检查
const autoPermissionApp = new OpenAPIHono<AppBindings>();

// 所有路由自动检查 API 权限
autoPermissionApp.use("*", authMiddleware, checkApiPermission());

autoPermissionApp.get("/auto/users", async (c) => {
  // 需要有 type="api", resource="/auto/users" 的权限
  return c.json({ message: "用户列表" });
});

autoPermissionApp.post("/auto/users", async (c) => {
  // 需要有 type="api", resource="/auto/users" 的权限
  return c.json({ message: "创建用户" });
});

autoPermissionApp.get("/auto/users/:id", async (c) => {
  // 需要有 type="api", resource="/auto/users/:id" 的权限
  const id = c.req.param("id");
  return c.json({ message: `用户详情: ${id}` });
});

// 挂载自动权限子应用
app.route("/api/example", autoPermissionApp);

// ============================================================
// 示例 10: 复杂业务场景 - 工单系统
// ============================================================

interface Ticket {
  id: number;
  title: string;
  status: "open" | "in_progress" | "closed";
  creatorId: number;
  assigneeId: number | null;
  departmentId: number;
}

const tickets: Ticket[] = [
  {
    id: 1,
    title: "工单1",
    status: "open",
    creatorId: 1,
    assigneeId: null,
    departmentId: 1,
  },
  {
    id: 2,
    title: "工单2",
    status: "in_progress",
    creatorId: 2,
    assigneeId: 1,
    departmentId: 2,
  },
];

// 查看工单 - 根据权限范围决定能看哪些工单
app.get("/api/example/tickets", checkPermission("ticket:read"), async (c) => {
  const userObj = c.var.userObj;

  // 查找用户的 ticket:read 权限
  const ticketReadPerm = userObj.permissions.find(
    (p) => p.code === "ticket:read"
  );

  if (!ticketReadPerm) {
    return c.json({ total: 0, list: [] });
  }

  let filtered: Ticket[] = [];

  // 根据权限范围过滤
  switch (ticketReadPerm.scope) {
    case "all":
      // 可以看所有工单
      filtered = tickets;
      break;
    case "own":
      // 只能看自己创建或分配给自己的工单
      filtered = tickets.filter(
        (t) => t.creatorId === userObj.userId || t.assigneeId === userObj.userId
      );
      break;
    case "dept":
      // 可以看本部门的工单
      const userDeptId = userObj.departmentObj?.value;
      filtered = tickets.filter((t) => t.departmentId === userDeptId);
      break;
    default:
      filtered = [];
  }

  return c.json({
    total: filtered.length,
    list: filtered,
  });
});

// 修改工单状态 - 只有分配人或管理员可以操作
app.put(
  "/api/example/tickets/:id/status",
  checkPermission("ticket:update"),
  async (c) => {
    const userObj = c.var.userObj;
    const id = parseInt(c.req.param("id"));
    const { status } = await c.req.json();

    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) {
      throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
    }

    // 检查是否为分配人
    const isAssignee = ticket.assigneeId === userObj.userId;

    // 检查是否有管理员权限
    const hasAdminPerm = userObj.permissions.some(
      (p) => p.code === "ticket:admin"
    );

    if (!isAssignee && !hasAdminPerm) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    ticket.status = status;
    return c.json({ message: "状态更新成功", data: ticket });
  }
);

// ============================================================
// 导出示例应用
// ============================================================

export default app;
