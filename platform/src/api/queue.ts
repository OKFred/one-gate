/** @description 请求队列管理器 */
export class RequestQueueManager {
  private queue: Map<string, { controller: AbortController; timestamp: number }> = new Map();
  private requestIdCounter = 0;

  /**
   * 添加请求到队列
   * @param controller AbortController 实例
   * @returns 请求 ID
   */
  addRequest(controller: AbortController): string {
    const id = `req_${++this.requestIdCounter}_${Date.now()}`;
    this.queue.set(id, { controller, timestamp: Date.now() });
    return id;
  }

  /**
   * 从队列中移除请求
   */
  removeRequest(id: string): void {
    this.queue.delete(id);
  }

  /**
   * abort 指定请求
   */
  abortRequest(id: string): void {
    const request = this.queue.get(id);
    if (request) {
      request.controller.abort();
      this.queue.delete(id);
    }
  }

  /**
   * abort 队列中的所有请求（除了指定的 ID）
   */
  abortAllRequests(exceptId?: string): void {
    for (const [id, { controller }] of this.queue.entries()) {
      if (id !== exceptId) {
        controller.abort();
      }
    }
    // 清空队列
    if (exceptId) {
      const current = this.queue.get(exceptId);
      this.queue.clear();
      if (current) {
        this.queue.set(exceptId, current);
      }
    } else {
      this.queue.clear();
    }
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.queue.size;
  }
}
