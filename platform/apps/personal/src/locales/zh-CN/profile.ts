/**
 * personal app — 个人档案页面文案
 * 包含性别枚举（原在 shared.ts 中错误归属）
 */
export const profile = {
  'gender.male': '男',
  'gender.female': '女',
} as const satisfies Record<string, string>;
