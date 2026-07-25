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
  'common.search': '搜索',
  'common.reset': '重置',
  'common.export': '导出',
  'common.import': '导入',
  'common.loading': '加载中...',
  'common.submitting': '提交中...',
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
} as const satisfies Record<string, string>;
