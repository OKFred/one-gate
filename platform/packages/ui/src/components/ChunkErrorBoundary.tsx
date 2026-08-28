import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const RELOAD_FLAG_KEY = 'chunk_reload_attempted';
const RELOAD_DELAY_MS = 250;
const STABLE_PAGE_DELAY_MS = 10_000;
let scheduledReload: number | null = null;
let scheduledFlagClear: number | null = null;

/**
 * 捕获 JS chunk 加载失败（发版后旧 chunk 文件不存在导致的 404）
 * 自动刷新页面一次，避免无限刷新
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      reloadOnce();
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/** 判断是否为 chunk 加载失败错误 */
function isChunkLoadError(error: Error): boolean {
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    /Loading chunk \d+ failed/.test(msg)
  );
}

/**
 * 刷新页面，防止无限刷新：
 * - 首次失败：写入 sessionStorage 标记，然后 reload
 * - 再次失败且标记存在：不再 reload（已是最新版本依然失败，让用户看到错误）
 */
export function reloadOnce() {
  const flag = sessionStorage.getItem(RELOAD_FLAG_KEY);
  if (flag || scheduledReload !== null) return;

  sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
  scheduledReload = window.setTimeout(() => {
    scheduledReload = null;
    window.location.reload();
  }, RELOAD_DELAY_MS);
}

/** 页面稳定运行后清除标记，为下一次发版做准备 */
export function clearReloadFlag() {
  if (scheduledFlagClear !== null) window.clearTimeout(scheduledFlagClear);
  scheduledFlagClear = window.setTimeout(() => {
    scheduledFlagClear = null;
    sessionStorage.removeItem(RELOAD_FLAG_KEY);
  }, STABLE_PAGE_DELAY_MS);
}
