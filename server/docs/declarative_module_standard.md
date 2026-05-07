# 声明式后端模块改造规范 (V1.0)

本规范基于 `system/menu` 模块重构经验制定，旨在消除冗余架构（如旧版 Guards/limitQuery），实现**职责清晰、信号明确、易于维护**的现代声明式架构。

---

## 一、 目录结构标准

每个业务模块必须包含且仅包含以下四个核心文件：

| 文件            | 职责            | 关键要求                                                            |
| :-------------- | :-------------- | :------------------------------------------------------------------ |
| `index.ts`      | **声明式入口**  | 仅负责定义 Namespace 并通过 `encapsulation` 包装 Service。          |
| `service.ts`    | **核心业务流**  | 负责数据库交互、结果转换。必须包含同步的 `buildWhereCondition`。    |
| `prevention.ts` | **拦截/校验层** | 所有的“禁止操作”逻辑。使用具名导出（Named Exports），抛出具体错误。 |
| `model.ts`      | **数据定义层**  | Drizzle 表结构定义、VO/PO 类型及 Schema。                           |

---

## 二、 Prevention（校验层）规范

### 1. 具名导出

严禁导出一个包含所有校验的巨型对象。必须使用 `export const preventXxx` 独立导出。

```typescript
// ✅ 推荐：明确且按需引入
export const preventCircularParent = async (...) => { ... }
```

### 2. 精确错误信号 (ErrorCodes)

模块内部定义 `ErrorCodes` 常量，Key 必须映射到 `initTranslation.ts` 中的国际化键。

```typescript
export const ErrorCodes = {
  SELF_PARENT: "errorHandler.menu.selfParent",
} as const;

// 抛出时：
throw new BusinessError(ErrorCodes.SELF_PARENT);
```

### 3. 文案补全

任何新定义的 `ErrorCode` 必须同步在 `src/db/initTranslation.ts` 中补全 `zh-CN` 和 `en-US` 翻译。

---

## 三、 Service（服务层）规范

### 1. 极简搜索逻辑 (`buildWhereCondition`)

弃用旧的 `limitQuery` 嵌套模式，统一采用“条件数组”模式。

- **同步执行**：函数不再声明为 `async`。
- **按需 Push**：使用 `hasValue` 校验后将 `SQL` 表达式推入数组。
- **灵活返回**：根据数组长度返回 `undefined`、单条件或 `and(...conditions)`。

```typescript
export const buildWhereCondition = (condition?: { ... }) => {
  const conditions = [];
  if (hasValue(keyword)) conditions.push(or(like(...)));
  // ...
  return conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;
};
```

### 2. 显式校验调用

在 `onAdd`、`onUpdate`、`onDelete` 的函数顶部，显式调用 `prevention` 函数。

```typescript
async function onUpdate(params, userObj) {
  const { id, parentId } = params;
  // ✅ 像安检一样清晰的前置校验
  preventSelfParent(id, parentId);
  await preventMissingParent(parentId);
  await preventCircularParent(id, parentId);

  // 执行数据库操作...
}
```

---

## 四、 改造流程 (Workflow)

1.  **[分析]** 识别原有 Service 里的 `guardOperation` 或 `if-throw` 逻辑。
2.  **[提取]** 在 `prevention.ts` 中创建具名的拦截函数。
3.  **[定义]** 为这些拦截点定义具体的 `errorHandler.模块.编码` 键，并补全翻译。
4.  **[简化]** 重写 `buildWhereCondition` 为同步数组模式。
5.  **[清理]** 删除该模块下的 `permission.ts`（旧模式残留），并移除 `limitQuery` 导入。
6.  **[适配]** 更新 `onList` / `onListAll` 中的调用，移除冗余的 `await`。

---

> **原则**：后端不应该只返回“参数错误”，而应该作为业务规则的坚定执行者，给前端返回“带有温度且信号明确”的反馈。
