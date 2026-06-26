import { getEnv, getAllEnv } from "@/utils/env";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";

export class DockerClient {
  private baseUrl: string;
  private apiVersion: string;
  private isInitialized = false;
  private dispatcher?: any;
  private cfMtlsBinding?: string;

  constructor() {
    // 构造函数不进行数据库查询，由 ensureInitialized 延迟执行以支持异步
  }

  /**
   * 重置初始化状态 (在配置发生改变时调用，清除 TLS dispatcher 缓存)
   */
  public reset() {
    this.isInitialized = false;
    this.dispatcher = undefined;
    this.cfMtlsBinding = undefined;
  }

  /**
   * 延迟异步载入默认配置，并依运行时环境（Node.js / Worker）自适应创建 mTLS 凭证
   */
  private async ensureInitialized() {
    if (this.isInitialized) return;

    try {
      // 动态导入以解决可能在 `client -> repository -> client` 产生的循环依赖
      const swarmDockerConfigRepository =
        await import("@/api/swarm/docker_config/repository");

      const config =
        await swarmDockerConfigRepository.findDefaultActiveConfig();
      if (config) {
        let { host } = config;
        if (host.startsWith("tcp://")) {
          host = host.replace(
            "tcp://",
            config.tlsVerify ? "https://" : "http://"
          );
        }
        if (host.endsWith("/")) {
          host = host.slice(0, -1);
        }
        this.baseUrl = host;
        this.apiVersion = config.apiVersion || "";
        this.cfMtlsBinding = config.cfMtlsBinding || undefined;

        if (config.tlsVerify) {
          const isNode =
            typeof process !== "undefined" && process.versions?.node != null;
          if (isNode) {
            // Node.js 运行时：通过 undici.Agent 挂载数据库读取的证书文本
            // @ts-ignore
            const { Agent } = await import("undici");
            const { caCert, clientCert, clientKey } = config;

            if (caCert && clientCert && clientKey) {
              this.dispatcher = new Agent({
                connect: {
                  rejectUnauthorized: true,
                  ca: caCert,
                  cert: clientCert,
                  key: clientKey,
                },
              });
            }
          }
        } else {
          this.dispatcher = undefined;
          this.cfMtlsBinding = undefined;
        }
      } else {
        throw new Error("❌ DockerClient 异步初始化配置失败，没有找到默认配置");
      }
    } catch (e) {
      console.error("❌ DockerClient 异步初始化配置失败:", e);
    }

    this.isInitialized = true;
  }

  /**
   * 跨平台统一 fetch 执行层
   */
  private async performFetch(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    await this.ensureInitialized();

    const cfMtls = this.cfMtlsBinding
      ? getAllEnv()[this.cfMtlsBinding]
      : undefined;
    if (cfMtls && typeof cfMtls.fetch === "function") {
      // Cloudflare Worker：直接通过 mTLS 绑定连接
      return await cfMtls.fetch(url, init);
    }

    // Node.js：注入 TLS dispatcher (如果存在)
    if (this.dispatcher) {
      (init as any).dispatcher = this.dispatcher;
    }
    return await fetch(url, init);
  }

  /**
   * 测试给定 Docker 配置参数的连通性
   */
  async testRawConnection(options: {
    host: string;
    apiVersion: string;
    tlsVerify: boolean;
    caCert?: string;
    clientCert?: string;
    clientKey?: string;
    cfMtlsBinding?: string;
  }): Promise<boolean> {
    let host = options.host;
    if (host.startsWith("tcp://")) {
      host = host.replace("tcp://", options.tlsVerify ? "https://" : "http://");
    }
    if (host.endsWith("/")) {
      host = host.slice(0, -1);
    }
    const url = `${host}/${options.apiVersion}/_ping`;

    const fetchOptions: any = {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 设置 5 秒超时
    };

    let dispatcher: any = undefined;
    const isNode =
      typeof process !== "undefined" && process.versions?.node != null;

    if (options.tlsVerify && isNode) {
      try {
        // @ts-ignore
        const { Agent } = await import("undici");
        if (options.caCert && options.clientCert && options.clientKey) {
          dispatcher = new Agent({
            connect: {
              rejectUnauthorized: true,
              ca: options.caCert,
              cert: options.clientCert,
              key: options.clientKey,
            },
          });
        }
      } catch (e) {
        console.error("testRawConnection load TLS Agent error:", e);
      }
    }

    const cfMtls = options.cfMtlsBinding
      ? getAllEnv()[options.cfMtlsBinding]
      : undefined;

    try {
      let response: Response;
      if (cfMtls && typeof cfMtls.fetch === "function") {
        response = await cfMtls.fetch(url, fetchOptions);
      } else {
        if (dispatcher) {
          fetchOptions.dispatcher = dispatcher;
        }
        response = await fetch(url, fetchOptions);
      }
      return response.ok && (await response.text()).trim() === "OK";
    } catch (err) {
      console.error("testRawConnection connection failed:", err);
      // 提取底层网络错误的可读描述
      const cause = (err as any)?.cause;
      const detail = (cause?.message || (err as Error)?.message || String(err))
        .replace(/^Error: /, "")
        .trim();
      throw new BusinessError(BusinessErrorCode.DOCKER_API_ERROR, { detail });
    }
  }

  private getUrl(path: string, queryParams?: Record<string, string>): string {
    const versionSegment = this.apiVersion ? `/${this.apiVersion}` : "";
    const url = `${this.baseUrl}${versionSegment}${path}`;
    if (queryParams) {
      const q = new URLSearchParams(queryParams).toString();
      return q ? `${url}?${q}` : url;
    }
    return url;
  }

  private async request<T = any>(
    method: string,
    path: string,
    options?: {
      body?: any;
      queryParams?: Record<string, string>;
    }
  ): Promise<T> {
    await this.ensureInitialized();
    const url = this.getUrl(path, options?.queryParams);
    const headers: Record<string, string> = {};
    let requestBody: any = undefined;

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(options.body);
    }

    const response = await this.performFetch(url, {
      method,
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const json = JSON.parse(text);
        if (json.message) detail = json.message;
      } catch {
        // text 不是 JSON，直接使用原始文本
      }
      throw new BusinessError(BusinessErrorCode.DOCKER_API_ERROR, {
        detail,
        status: response.status,
        statusText: response.statusText,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as any;
  }

  /**
   * 列出所有服务
   */
  async listServices(filters?: Record<string, string[]>): Promise<any[]> {
    const queryParams: Record<string, string> = {};
    if (filters) {
      queryParams.filters = JSON.stringify(filters);
    }
    return this.request("GET", "/services", { queryParams });
  }

  /**
   * 获取单个服务详情
   */
  async inspectService(idOrName: string): Promise<any> {
    return this.request("GET", `/services/${encodeURIComponent(idOrName)}`);
  }

  /**
   * 创建服务
   */
  async createService(spec: any): Promise<{ ID: string }> {
    return this.request<{ ID: string }>("POST", "/services/create", {
      body: spec,
    });
  }

  /**
   * 更新服务
   */
  async updateService(
    idOrName: string,
    spec: any,
    version: number
  ): Promise<void> {
    await this.request(
      "POST",
      `/services/${encodeURIComponent(idOrName)}/update`,
      {
        body: spec,
        queryParams: { version: String(version) },
      }
    );
  }

  /**
   * 删除服务
   */
  async removeService(idOrName: string): Promise<void> {
    await this.request("DELETE", `/services/${encodeURIComponent(idOrName)}`);
  }

  /**
   * 列出所有任务 (用于查找到活跃容器运行状态)
   */
  async listTasks(filters?: Record<string, string[]>): Promise<any[]> {
    const queryParams: Record<string, string> = {};
    if (filters) {
      queryParams.filters = JSON.stringify(filters);
    }
    return this.request("GET", "/tasks", { queryParams });
  }

  /**
   * 获取 Swarm 服务日志并解包二进制多路复用帧
   */
  async getServiceLogs(idOrName: string, tail: number = 100): Promise<string> {
    const queryParams = {
      stdout: "true",
      stderr: "true",
      timestamps: "true",
      tail: String(tail),
    };
    const url = this.getUrl(
      `/services/${encodeURIComponent(idOrName)}/logs`,
      queryParams
    );
    const response = await this.performFetch(url, { method: "GET" });

    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const json = JSON.parse(text);
        if (json.message) detail = json.message;
      } catch {
        // text 不是 JSON，直接使用原始文本
      }
      throw new BusinessError(BusinessErrorCode.DOCKER_API_ERROR, {
        detail,
        status: response.status,
        statusText: response.statusText,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 解析 Multiplexed Stream 头部字节帧 (8 字节 header)
    let offset = 0;
    const result: string[] = [];
    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) {
        break;
      }
      const size = buffer.readUInt32BE(offset + 4);
      offset += 8;
      if (offset + size > buffer.length) {
        const payload = buffer.toString("utf8", offset);
        result.push(payload);
        break;
      }
      const payload = buffer.toString("utf8", offset, offset + size);
      result.push(payload);
      offset += size;
    }

    if (result.length === 0 && buffer.length > 0) {
      return buffer.toString("utf8");
    }
    return result.join("");
  }

  /**
   * 获取 Swarm 服务下所有运行容器的负载实时监控数据
   */
  async getServiceStats(idOrName: string): Promise<any[]> {
    const tasks = await this.listTasks({
      service: [idOrName],
      "desired-state": ["running"],
    });

    const statsResults: any[] = [];

    await Promise.all(
      tasks.map(async (task) => {
        const containerId = task.Status?.ContainerStatus?.ContainerID;
        if (!containerId) return;

        try {
          const url = this.getUrl(
            `/containers/${encodeURIComponent(containerId)}/stats`,
            { stream: "false" }
          );
          const response = await this.performFetch(url, { method: "GET" });
          if (!response.ok) return;

          const stats = (await response.json()) as any;

          // 1. CPU 使用率公式折算
          let cpuPercent = 0;
          if (stats.cpu_stats && stats.precpu_stats) {
            const cpuDelta =
              (stats.cpu_stats.cpu_usage?.total_usage || 0) -
              (stats.precpu_stats.cpu_usage?.total_usage || 0);
            const systemDelta =
              (stats.cpu_stats.system_cpu_usage || 0) -
              (stats.precpu_stats.system_cpu_usage || 0);
            const onlineCpus =
              stats.cpu_stats.online_cpus ||
              stats.cpu_stats.cpu_usage?.percpu_usage?.length ||
              1;
            if (systemDelta > 0 && cpuDelta > 0) {
              cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100;
            }
          }

          // 2. 内存使用率公式折算 (减去操作系统 Cache 缓存以配合 Docker stats 算法)
          let memoryUsage = 0;
          let memoryLimit = 0;
          let memoryPercent = 0;
          if (stats.memory_stats) {
            const cache =
              stats.memory_stats.stats?.cache ||
              stats.memory_stats.stats?.inactive_file ||
              0;
            memoryUsage = (stats.memory_stats.usage || 0) - cache;
            memoryLimit = stats.memory_stats.limit || 0;
            if (memoryLimit > 0) {
              memoryPercent = (memoryUsage / memoryLimit) * 100;
            }
          }

          // 3. 网络流量吞吐 (Rx / Tx)
          let networkRx = 0;
          let networkTx = 0;
          if (stats.networks) {
            for (const key of Object.keys(stats.networks)) {
              const iface = stats.networks[key];
              networkRx += iface.rx_bytes || 0;
              networkTx += iface.tx_bytes || 0;
            }
          }

          // 4. 磁盘块 I/O (Read / Write)
          let blkRead = 0;
          let blkWrite = 0;
          if (stats.blkio_stats?.io_service_bytes_recursive) {
            for (const io of stats.blkio_stats.io_service_bytes_recursive) {
              const op = (io.op || "").toLowerCase();
              if (op === "read" || op === "r") {
                blkRead += io.value || 0;
              } else if (op === "write" || op === "w") {
                blkWrite += io.value || 0;
              }
            }
          }

          statsResults.push({
            taskId: task.ID,
            containerId,
            nodeId: task.NodeID,
            cpuPercent: Math.round(cpuPercent * 100) / 100,
            memoryUsage,
            memoryLimit,
            memoryPercent: Math.round(memoryPercent * 100) / 100,
            networkRx,
            networkTx,
            blkRead,
            blkWrite,
          });
        } catch (e) {
          // 容器 stats 报错静默处理
        }
      })
    );

    return statsResults;
  }

  /**
   * 列出所有 Swarm 节点
   */
  async listNodes(filters?: Record<string, string[]>): Promise<any[]> {
    const queryParams: Record<string, string> = {};
    if (filters) {
      queryParams.filters = JSON.stringify(filters);
    }
    return this.request("GET", "/nodes", { queryParams });
  }
}

export const dockerClient = new DockerClient();
