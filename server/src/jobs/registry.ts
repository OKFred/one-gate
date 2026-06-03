import { AppDatabase } from "@/db/index";

export interface JobContext {
  params: any;
  db: AppDatabase;
}

export type JobHandler = (ctx: JobContext) => Promise<void>;

/**
 * 统一的任务执行函数映射表
 */
export const jobsRegistry: Record<string, JobHandler> = {
  /**
   * 测试任务：控制台打印参数
   */
  test_log: async ({ params }) => {
    console.log(
      `[Job: test_log] 执行成功。当前时间: ${new Date().toISOString()}, 传入参数:`,
      params
    );
  },

  /**
   * 模拟数据同步任务
   */
  sync_external_data: async ({ params }) => {
    console.log(`[Job: sync_external_data] 开始同步数据...`, params);
    // 模拟耗时
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`[Job: sync_external_data] 数据同步完毕。`);
  },
};
