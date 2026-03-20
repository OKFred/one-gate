/**
 * 数据访问范围枚举
 *
 * 用于角色级别的数据权限控制，决定该角色的用户能查看/操作哪些数据范围。
 * 与接口访问权限（菜单/按钮/路由）解耦，仅作用于数据库查询过滤层。
 */
export const DataScope = {
  /** 全部数据，不加任何限制 */
  ALL: "all",
  /** 用户可管理的部门及其所有子孙部门 */
  DEPT_AND_BELOW: "dept_and_below",
  /** 仅用户自己创建/操作的数据（默认值） */
  SELF_ONLY: "self_only",
  /** 自定义部门列表，由角色的 customDeptIds 字段指定 */
  CUSTOM: "custom",
} as const;

export type DataScopeValue = (typeof DataScope)[keyof typeof DataScope];

/** DataScope 所有合法值，用于 JSON Schema 校验 */
export const DataScopeValues = Object.values(DataScope) as [
  DataScopeValue,
  ...DataScopeValue[],
];
