# 全局通知组件

本项目提供两种全局通知方式：

## 1. Snackbar（轻量级提示）

适用于快速提示信息，推荐用于大多数场景：
- ✅ 接口请求成功提示
- ✅ 接口请求失败提示
- ✅ 表单保存成功
- ✅ 操作成功/失败反馈
- ✅ 临时通知信息

### 使用方法

```tsx
import { showSnackbar } from '@/components/Notification';

// 成功提示
showSnackbar({
  message: '操作成功',
  type: 'success',
});

// 错误提示
showSnackbar({
  message: '操作失败',
  type: 'error',
});

// 警告提示
showSnackbar({
  message: '请注意',
  type: 'warning',
});

// 信息提示
showSnackbar({
  message: '提示信息',
  type: 'info',
});

// 自定义配置
showSnackbar({
  message: '这是一条自定义提示',
  type: 'success',
  duration: 5000, // 显示时长（毫秒），默认 3000
  position: {
    vertical: 'top',    // 'top' | 'bottom'
    horizontal: 'center' // 'left' | 'center' | 'right'
  }
});
```

## 2. Dialog（对话框通知）

适用于需要用户确认或重要操作的场景：
- ✅ 删除确认对话框
- ✅ 登录过期跳转
- ✅ 需要用户确认的重要提示
- ✅ 需要执行回调的场景

### 使用方法

```tsx
import { showGlobalNotification } from '@/components/Notification';

// 基础用法
showGlobalNotification({
  message: '确认删除该对话吗？',
  type: 'warning',
});

// 带回调
showGlobalNotification({
  message: '确认删除该对话吗？',
  type: 'warning',
  callback: (action) => {
    if (action === 'confirm') {
      // 用户点击确认
      console.log('用户确认删除');
    }
  },
});

// 带 beforeClose（可以阻止关闭）
showGlobalNotification({
  message: '登录已过期',
  type: 'warning',
  beforeClose: (action, instance, done) => {
    // 执行一些操作
    authUtils.logout();
    window.location.href = '/login';
    // 调用 done() 关闭对话框
    done();
  },
});
```

## 类型定义

### SnackbarOptions
```typescript
interface SnackbarOptions {
  message: string;                    // 提示信息
  type?: 'success' | 'error' | 'warning' | 'info'; // 类型，默认 'info'
  duration?: number;                  // 显示时长（毫秒），默认 3000
  position?: {
    vertical: 'top' | 'bottom';       // 垂直位置
    horizontal: 'left' | 'center' | 'right'; // 水平位置
  };
}
```

### NotificationOptions
```typescript
interface NotificationOptions {
  message: string;                    // 提示信息
  type?: 'error' | 'warning' | 'info' | 'success'; // 类型，默认 'info'
  title?: string;                     // 自定义标题
  callback?: (action: 'confirm' | 'cancel' | 'close') => void; // 回调函数
  beforeClose?: (
    action: 'confirm' | 'cancel' | 'close',
    instance: { close: () => void },
    done: () => void
  ) => void;                          // 关闭前回调
  showClose?: boolean;                // 是否显示关闭按钮，默认 true
}
```

## 使用建议

1. **接口请求反馈**：优先使用 `showSnackbar`，简洁高效
2. **删除操作**：使用 `showGlobalNotification` 加确认回调
3. **成功操作**：使用 `showSnackbar` type 为 'success'
4. **错误提示**：已在 axios 拦截器中自动使用 `showSnackbar`
5. **重要警告**：需要用户明确确认时使用 `showGlobalNotification`

## 示例

```tsx
// 示例1：表单保存成功
const handleSave = async () => {
  try {
    await saveData();
    showSnackbar({ 
      message: '保存成功', 
      type: 'success' 
    });
  } catch (error) {
    // 错误会被 axios 拦截器自动处理，无需手动显示
  }
};

// 示例2：删除确认
const handleDelete = () => {
  showGlobalNotification({
    message: '确认删除该项吗？此操作不可恢复',
    type: 'warning',
    callback: async (action) => {
      if (action === 'confirm') {
        try {
          await deleteItem();
          showSnackbar({ 
            message: '删除成功', 
            type: 'success' 
          });
        } catch (error) {
          // 错误会被 axios 拦截器自动处理
        }
      }
    },
  });
};
```
