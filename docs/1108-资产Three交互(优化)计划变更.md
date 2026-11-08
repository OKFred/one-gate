# 资产 Three.js 交互计划变更

日期：2026-11-08。

| 文件范围                                                   | 变更                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| personal/package.json、platform/pnpm-lock.yaml             | three 及匹配的 @types/three，限定 personal 应用                                |
| personal/pages/asset/HouseScene.tsx 及新 Three 组件/helper | 单 canvas、房屋与实例化设备、鼠标/触屏交互、拾取、帧/资源生命周期及 WebGL 回退 |
| personal/pages/asset/AssetWorkspace.tsx                    | 单场景组合、复用楼层和 UUID 选择回调                                           |
| personal/locales/zh-CN、en-US/asset.ts                     | 鼠标操作、3D 状态、兼容性和重置视角文案                                        |
| e2e/personal-assets.spec.ts 及必要测试 fixture/config      | 真实渲染与相机/拾取/拖动/回退测试，更新原 SVG 断言                             |
| 同日实际落地文档                                           | 计划差异、复盘、类型和测试结果、未执行边界                                     |

实施顺序：设计/计划 → 依赖及类型基线 → 并行场景与测试 → 实际鼠标预览 → 格式/类型/构建与复盘 → 推送现有 PR。

不改后端、接口、迁移、源数据、采集、生产资源、Access 或在线状态接入门禁。不额外引入模型下载、编辑器、摄像机路径持久化和物理模拟。
