# 资产 Three.js 交互详细设计

日期：2026-11-08。基线为 `codex/personal-assets-spaces` 的 `ecd7c085`，继续更新现有草稿 PR #19。

## 目标与范围

按用户要求把房屋空间从 SVG 改成真正的 Three.js 场景，可用鼠标直接旋转、缩放、平移和点选设备。保留 OpenLife 单层、OpenMind 四层、楼层切换、资产清单/详情联动和在线证据语义。仅改前端展示，不改接口、数据库、生产、采集或授权。

## 最小实现

仅 personal 应用增加同版本的 `three` 与开发类型 `@types/three`，使用原生 Three.js 与官方 OrbitControls，不引入 React Three Fiber、Drei、物理引擎或外部模型资源。新增共享的单个 WebGL2 canvas，同时绘制两处房屋、当前层设备与中性互联虚线；使用简单几何及实例化设备，最多接纳现有接口有界的 1000 项资产。

房屋和设备布局仍是示意，不保存未经确认的坐标。区域/楼层为空的设备留在待定位列表，虚拟资源只跟随已明确的父设备。真实在线状态仍为未知，合成演示与真实台账保持隔离。

## 交互

- 左键拖动旋转，滚轮缩放，右键拖动平移；触屏沿用 OrbitControls 的单指旋转、双指缩放/平移。
- 指针短点击使用 Raycaster 命中设备并返回原 UUID，打开已有详情；移动超过阈值、多指、取消或拖动不能触发选择。
- 列表/键盘选择在同一场景高亮资产并切换对应楼层；楼层、完整设备访问及视角重置保留 HTML 控件，canvas 不是唯一入口。
- 悬停可见设备名称；帮助文案说明鼠标操作，设备状态继续用文字和语义色表达。

## 生命周期与兼容性

OrbitControls change、楼层/状态/选择/尺寸/主题变化触发按需渲染，不在业务数据更新时重建相机。仅互联虚线动画需要连续帧，降低动态偏好、页面隐藏或上下文丢失时停止。限制设备像素比，ResizeObserver 更新尺寸和投影，移动视口也能看到两个区域。

卸载或身份/企业切换后移除事件、observer、帧任务、controls，并释放 geometry/material/renderer；不遗留旧 UUID 或 GPU 上下文。WebGL2 不可用或上下文丢失时显示明确提示，保留普通列表、楼层和键盘设备入口，不无限自动重建，不假称当前正在显示 3D。

## 测试可观察合同

canvas 使用 `data-testid=asset-three-canvas`；父容器暴露 `data-render-state=ready|unavailable|lost`。`data-camera` 从真实 camera/controls 派生，包含 position、target、zoom；`data-link-animation` 反映运行/暂停。有限的 `data-pick-targets` 仅含已授权当前层的 UUID 和真实屏幕投影 CSS 像素坐标，供自动化短点击验证，不暴露 Three 对象、源身份或新查询接口。

测试必须检查实际 WebGL2、拖动/滚轮/平移后的相机变化、Raycaster 选择、拖动防误选、减少动态、上下文丢失和不支持时的回退；不能只点按钮或对空集合断言。原有身份隔离、失败结果、位置 CAS、过期和子资源回归保持。

## 交付

先保存个人包类型基线；完成后格式、ESLint、类型前后对比、相关 UI 测试、构建及 git diff --check，再按仓库流程复盘并输出实际落地记录。更新本地合成预览及现有草稿 PR；未获新授权不合并 main、不发布生产。

依据：Three.js 官方 OrbitControls、WebGLRenderer、按需渲染及资源清理文档，实施时已核对当前 API。真实设备和生产 presence 的未接通边界继续保留。
