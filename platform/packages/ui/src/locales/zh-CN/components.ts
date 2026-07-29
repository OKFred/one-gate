/**
 * 通用 UI 组件文案
 * 表格、表单、筛选器、对话框、列名、分页、状态值等
 */
export const components = {
  // 表格
  'table.actions': '操作',
  'table.refresh': '刷新',
  'table.pageSizeLabel': '每页条数',
  'table.deleteConfirm': '确定要删除吗？此操作不可撤销。',

  // 列名（通用）
  'column.id': 'ID',
  'column.status': '状态',
  'column.createTime': '创建时间',
  'column.updateTime': '更新时间',
  'column.creatorName': '创建人',
  'column.updaterName': '修改人',
  'column.name': '名称',
  'column.remark': '备注',
  'column.language': '语言',
  'column.category': '分类',
  'column.noData': '暂无数据',
  'column.yes': '是',
  'column.no': '否',
  'column.unassigned': '未分配',
  'column.permissionCount': '权限数量',
  // 兼容旧 columns.* 前缀（逐步迁移）
  'columns.id': 'ID',
  'columns.status': '状态',
  'columns.createTime': '创建时间',
  'columns.updateTime': '更新时间',
  'columns.actions': '操作',
  'columns.name': '名称',
  'columns.permissionCount': '权限数量',

  // 表单
  'form.pleaseEnter': '请输入',
  'form.select': '请选择',
  'form.missingCredentials': '请输入用户名和密码',

  // 筛选器
  'filter.title': '搜索与筛选',
  'filter.clear': '清除筛选',
  'filter.keyword': '关键词',
  'filter.keywordLabel': '关键字搜索',
  'filter.orderBy': '排序字段',
  'filter.sortOrder': '排序方式',
  'filter.asc': '升序',
  'filter.desc': '降序',
  'filter.enabledStatus': '启用状态',
  'filter.all': '全部',
  'filter.condition': '筛选条件',
  'filter.results': '{count} 个结果',
  'search.keyword': '关键词',

  // 弹窗/对话框
  'dialog.add': '新增',
  'dialog.edit': '编辑',
  'dialog.delete': '删除',
  'dialog.save': '保存',
  'dialog.confirm': '确定',
  'dialog.cancel': '取消',
  'dialog.close': '关闭',
  'dialog.required': '该项为必填项',
  'dialog.deleteConfirmTitle': '确认删除',
  'dialog.operationSuccess': '操作成功',
  'dialog.message': '页面未找到',
  'dialog.goBackHome': '返回首页',
  'dialog.titie.error': '错误提示',
  'dialog.titie.warning': '警告',
  'dialog.titie.success': '成功',
  'dialog.titie.info': '提示',

  // 状态值
  'status.success': '成功',
  'status.failure': '失败',
  'status.enabled': '启用',
  'status.disabled': '禁用',

  // 分页
  'pagination.prev': '上一页',
  'pagination.next': '下一页',

  // 页面通用
  'page.details': '详情',
} as const satisfies Record<string, string>;
