# Schema-Driven Form 开发指南

本系统提供了一套基于 JSON Schema 自动驱动的表单校验与 UI 渲染方案。旨在消除重复的校验逻辑，实现前后端校验规则的严格同步。

## 核心理念

- **自动化校验**：前端自动加载后端生成的 JSON Schema，利用 AJV 进行校验，并配合 i18n 自动显示多语言错误信息。
- **零样板代码**：无需手动为每个输入框绑定 `error` 和 `helperText` 属性。
- **类型安全**：全量支持 TypeScript，严格禁止 `any`，确保表单数据的健壮性。

## 核心组件

### 1. SchemaForm

表单容器，负责管理错误状态池并向下透传 Schema 上下文。

```tsx
import { SchemaForm } from '@/components/Form';
import regionSchema from '@/assets/schemas/i18n.regionAddReq.json';

// 在 Dialog 或 Page 中使用
<SchemaForm schema={regionSchema} contextValue={errorContextValue}>
  <Stack spacing={3}>
    <Field name="alpha2Code" label="国家代码" value={form.alpha2Code} ... />
  </Stack>
</SchemaForm>
```

> **注意**：如果外部需要手动触发校验（如在 Submit 按钮处），请通过 `useFormError` 钩子获取状态，并传给 `SchemaForm` 的 `contextValue` 属性以实现状态同步。

### 2. Field

通用的原子输入组件入口。它会根据 `type` 自动分发到对应的具体输入组件。

| Type           | 对应组件          | 说明                                  |
| :------------- | :---------------- | :------------------------------------ |
| `text`         | TextField         | 默认类型，普通文本                    |
| `number`       | TextField         | 数字输入，会自动映射 `min/max`        |
| `password`     | TextField         | 密码输入                              |
| `switch`       | SwitchField       | 开关切换                              |
| `select`       | SelectField       | 下拉选择，自动支持 Schema 中的 `enum` |
| `checkbox`     | CheckboxField     | 勾选框                                |
| `autocomplete` | AutocompleteField | 自动补全/多选，支持搜索               |

## 适配步骤 (迁移路径)

### 步骤 1：引入 Schema

确保后端 Model 已经通过 Vite 插件生成了对应的 JSON 文件。

```typescript
import regionSchema from '@/assets/schemas/i18n.regionAddReq.json';
```

### 步骤 2：初始化 Hook

在组件顶层使用 `useFormError`。

```typescript
const { fieldErrors, handleFormError, clearErrors, clearFieldError, rootSchema } =
  useFormError(regionSchema);

const errorContextValue = useMemo(
  () => ({ fieldErrors, clearFieldError, rootSchema }),
  [fieldErrors, clearFieldError, rootSchema],
);
```

### 步骤 3：替换 MUI 组件

将原本的 `<TextField>` 或 `<FormControl>` 替换为 `<Field>`。

**重构前：**

```tsx
<TextField
  label="国家代码"
  value={form.alpha2Code}
  onChange={(e) => setForm({ ...form, alpha2Code: e.target.value })}
  error={!!fieldErrors.alpha2Code}
  helperText={fieldErrors.alpha2Code}
/>
```

**重构后：**

```tsx
<Field
  name="alpha2Code"
  label="国家代码"
  value={form.alpha2Code}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, alpha2Code: e.target.value })
  }
/>
```

_`Field` 会自动通过 `name` 属性从 Context 中查找错误信息。_

### 步骤 4：处理复杂类型 (如 Autocomplete)

由于 `Field` 是联合类型，对于多选或复杂对象，建议使用 `unknown` 接收并断言：

```tsx
<Field
  type="autocomplete"
  name="languages"
  multiple
  value={form.languages}
  onChange={(newValue: unknown) => {
    const val = newValue as string[];
    setForm({ ...form, languages: val });
  }}
/>
```

## TypeScript 规范

1. **禁止使用 any**：如果遇到第三方库类型不匹配，优先使用 `unknown` 并配合类型断言（Type Assertion）。
2. **onChange 约束**：
   - `text/number/select` 类型使用 `React.ChangeEvent<HTMLInputElement>` 或其具体值类型。
   - `switch/checkbox` 类型使用 `(checked: boolean) => void`。
   - `autocomplete` 类型使用 `(value: unknown) => void`。

## 常见问题

- **错误提示不显示？**
  检查 `Field` 的 `name` 是否与 JSON Schema 中的属性名完全一致（区分大小写）。
- **点击保存无反应？**
  检查 `handleSubmit` 逻辑中是否正确调用了 `handleFormError(err)`。如果是 `HTTPException` 抛出的错误，该方法会自动解析后端返回的校验细节并填充到 UI。
