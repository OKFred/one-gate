/** @description 请求队列管理器 */
export declare class RequestQueueManager {
  private queue;
  private requestIdCounter;
  /**
   * 添加请求到队列
   * @param controller AbortController 实例
   * @returns 请求 ID
   */
  addRequest(controller: AbortController): string;
  /**
   * 从队列中移除请求
   */
  removeRequest(id: string): void;
  /**
   * abort 指定请求
   */
  abortRequest(id: string): void;
  /**
   * abort 队列中的所有请求（除了指定的 ID）
   */
  abortAllRequests(exceptId?: string): void;
  /**
   * 获取队列大小
   */
  getQueueSize(): number;
}
