/**
 * 通用动词、状态与操作文案
 * 任何页面、任何业务都可能用到的公共词汇
 */
export const common = {
  'common.cancel': '取消',
  'common.confirm': '确定',
  'common.save': '保存',
  'common.submit': '提交',
  'common.edit': '编辑',
  'common.delete': '删除',
  'common.view': '查看',
  'common.refresh': '刷新',
  'common.add': '新增',
  'common.close': '关闭',
  'common.copy': '复制',
  'common.all': '全部',
  'common.search': '搜索',
  'common.reset': '重置',
  'common.export': '导出',
  'common.import': '导入',
  'common.loading': '加载中...',
  'common.submitting': '提交中...',
  'common.submitSuccess': '提交成功',
  'common.saveSuccess': '保存成功',
  'common.deleteSuccess': '删除成功',
  'common.operateSuccess': '操作成功',
  'common.deleting': '删除中...',
  'common.saving': '保存中',
  'common.searching': '搜索中...',
  'common.loadMore': '加载更多',
  'common.fullScreen': '全屏',
  'common.exitFullScreen': '退出全屏',
  'common.collapseAll': '折叠所有',
  'common.expandAll': '展开所有',
  'common.confirmDelete': '确认删除',
  'common.isEnabled': '是否启用',
  'common.permanent': '永久',
  'common.filter': '筛选',
  'common.results': '个结果',
  'common.welcome': '欢迎使用管理系统',
  'common.welcomeSubtitle': '提供高效便捷的工作流与组织管理方案',

  // 网络层公共错误文案（前端 HTTP 拦截器使用）
  'error.requestFailed': '请求失败',
  'error.sessionExpired': '登录已过期，请重新登录',
  'error.networkError': '网络错误',
  'error.networkOrServiceUnavailable':
    '网络或服务暂不可用，请稍后重试；若持续发生，请联系管理员检查平台额度和服务状态。',
  'error.serverUnavailable': '服务暂不可用，请稍后重试；若持续发生，请联系管理员。',
  'error.requestRateLimited': '请求过于频繁，请稍后手动重试；若持续发生，请联系管理员。',
  'error.cloudflareD1DailyReadLimit':
    'Cloudflare D1 今日读取额度已用尽，服务暂不可用。请在 UTC 00:00 额度重置后重试，或联系管理员调整套餐。',
  'error.cloudflareD1DailyWriteLimit':
    'Cloudflare D1 今日写入额度已用尽，服务暂不可用。请在 UTC 00:00 额度重置后重试，或联系管理员调整套餐。',
  'error.cloudflareD1StorageLimit':
    'Cloudflare D1 存储容量已达上限，服务暂不可用，请联系管理员检查数据库容量。',
  'error.cloudflareKvQuotaExceeded':
    'Cloudflare KV 额度已用尽，相关服务暂不可用，请联系管理员检查额度和套餐。',
  'error.cloudflareKvRateLimited':
    'Cloudflare KV 请求受到限流，请稍后手动重试；若持续发生，请联系管理员。',
  'error.cloudflareWorkersDailyLimit':
    'Cloudflare Workers 今日请求额度已用尽，服务暂不可用，请在额度重置后重试，或联系管理员调整套餐。',
  'error.cloudflareWorkersResourceLimit':
    'Cloudflare Workers 本次运行超出 CPU 或内存限制，请稍后手动重试；若持续发生，请联系管理员。',
} as const satisfies Record<string, string>;
