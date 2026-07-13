import type { UserObj } from "../../types/app.js";

/** 通用动作映射，将抽象动作映射到具体的权限码后缀 */
const ACTION_MAP: Record<string, string[]> = {
  read: ["list", "get", "view"],
  create: ["add", "create"],
  update: ["edit", "update"],
  delete: ["delete", "remove"],
};

/**
 * 权限检查核心函数
 * @param user 用户对象
 * @param action 动作 (如 'read', 'add', 'edit', 'delete')
 * @param resource 资源标识符 (如 'enterprise.attendance')
 * @remark 暂时先作为异步，便于后续拓展
 * @returns 是否拥有权限
 */
export async function can(
  user: UserObj,
  action: string,
  resource: string
): Promise<boolean> {
  // 核心：确保权限数据已加载
  await user.ensureLoaded();

  if (user.isSuperAdmin) return true;

  // 1. 尝试直接查找 (例如 enterprise.attendance:add)
  const directCode = `${resource}:${action}`;
  if (user.permissions.some((p) => p.code === directCode)) return true;

  // 2. 如果是通用动作，尝试映射查找（例如：action是'read'，尝试查找enterprise.attendance:list、enterprise.attendance:get、enterprise.attendance:view）
  const mappedActions = ACTION_MAP[action] || [];
  for (const ma of mappedActions) {
    if (user.permissions.some((p) => p.code === `${resource}:${ma}`))
      return true;
  }

  return false;
}
