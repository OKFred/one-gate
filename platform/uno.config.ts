import { defineConfig, presetAttributify, presetUno, presetIcons } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(), // 默认原子化类
    presetAttributify(), // 支持属性模式 eg. <div text="red-500 white" />
    presetIcons(), // 使用图标
  ],
});
