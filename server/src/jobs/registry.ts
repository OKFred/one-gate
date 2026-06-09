import { AppDatabase } from "@/db/index";

export interface JobContext {
  params: any;
  db: AppDatabase;
}

export type JobHandler = (ctx: JobContext) => Promise<void>;

/**
 * 统一的任务执行函数映射表
 */
export const jobsRegistry: Record<string, JobHandler> = {};
