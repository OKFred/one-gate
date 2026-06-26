import {
  findWorkflowById,
  findDefaultActiveConfig,
  onLogInsert,
  onLogUpdate,
} from "./repository";
import { dockerClient } from "@/api/swarm/docker/client";
import { SUPER_ADMIN_ID } from "@/db/init";

// 轻量级原生 CDP 客户端封装，基于全局 WebSocket
class CDPClient {
  private ws: any;
  private id = 0;
  private pending = new Map<number, (res: any) => void>();

  constructor(private wsUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // @ts-ignore
        this.ws = new globalThis.WebSocket(this.wsUrl);
      } catch (e) {
        return reject(e);
      }
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err: any) =>
        reject(
          new Error(
            "WebSocket 连接失败，请检查 CDP 调试地址是否已启动并正确配置。"
          )
        );
      this.ws.onmessage = (event: any) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.pending.has(msg.id)) {
            const resolvePending = this.pending.get(msg.id);
            if (resolvePending) {
              resolvePending(msg);
              this.pending.delete(msg.id);
            }
          }
        } catch (e) {
          console.error("CDP Message parse error:", e);
        }
      };
    });
  }

  send(method: string, params: any = {}, sessionId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const msgId = ++this.id;
      this.pending.set(msgId, (res) => {
        if (res.error) {
          reject(new Error(res.error.message || JSON.stringify(res.error)));
        } else {
          resolve(res.result);
        }
      });
      try {
        const payload: any = { id: msgId, method, params };
        if (sessionId) {
          payload.sessionId = sessionId;
        }
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        this.pending.delete(msgId);
        reject(err);
      }
    });
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
    }
  }
}

export interface LogStep {
  nodeId: string;
  nodeName: string;
  type: string;
  status: "success" | "failed" | "skipped";
  message: string;
  screenshot?: string; // base64
  result?: any; // 执行返回值
  time: number;
}

export async function runWorkflow(
  workflowId: number,
  triggerType: "manual" | "cron" = "manual"
) {
  const workflow = await findWorkflowById(workflowId);
  if (!workflow || !workflow.isEnabled) {
    console.warn(
      `[Workflow Engine] Workflow ${workflowId} not found or disabled.`
    );
    return;
  }

  const startTime = Date.now();
  const stepLogs: LogStep[] = [];

  // 1. 初始化日志记录
  const logId = await onLogInsert({
    workflowId,
    status: "running",
    triggerType,
    startTimeUtc: startTime,
    endTimeUtc: null,
    logs: JSON.stringify(stepLogs),
    creatorId: SUPER_ADMIN_ID,
  });

  const appendStepLog = async (step: Omit<LogStep, "time">) => {
    const fullStep: LogStep = { ...step, time: Date.now() };
    stepLogs.push(fullStep);
    if (logId) {
      await onLogUpdate(logId, {
        logs: JSON.stringify(stepLogs),
      });
    }
  };

  let cdpClient: CDPClient | null = null;
  let targetId: string | null = null;
  let sessionId: string | null = null;

  try {
    // 解析 nodes 与 edges
    const flow = JSON.parse(workflow.flowData);
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    // 拓扑/执行排序
    // 找出起点节点 (即没有输入连接的节点，或者触发器节点)
    const triggerNodes = nodes.filter(
      (n: any) =>
        n.type === "start" || !edges.some((e: any) => e.target === n.id)
    );
    if (triggerNodes.length === 0) {
      throw new Error("工作流缺乏起点节点(Start Node)。");
    }

    // 依次执行节点链
    // 简单遍历：从起点出发，每次寻找出度 edge 的下一个节点，线性串行执行
    let currentNode = triggerNodes[0];
    const visited = new Set<string>();

    // 获取激活的默认配置，用于 CDP 浏览器连接
    const activeConfig = await findDefaultActiveConfig();

    while (currentNode && !visited.has(currentNode.id)) {
      visited.add(currentNode.id);
      const { id: nodeId, data = {}, type: nodeType } = currentNode;
      const nodeName = data.label || nodeType;

      let normalizedType = nodeType;
      if (nodeId.includes("start") || nodeType === "input") {
        normalizedType = "start";
      } else if (nodeId.includes("cdp")) {
        normalizedType = "cdp";
      } else if (nodeId.includes("docker")) {
        normalizedType = "docker";
      }

      await appendStepLog({
        nodeId,
        nodeName,
        type: normalizedType,
        status: "success",
        message: `开始执行节点: ${nodeName}`,
      });

      // 2. 根据节点类型执行相应逻辑
      if (normalizedType === "start") {
        // 起点节点
        await appendStepLog({
          nodeId,
          nodeName,
          type: normalizedType,
          status: "success",
          message: `流程正常触发，触发方式: ${triggerType}`,
        });
      } else if (normalizedType === "cdp") {
        // CDP 浏览器节点
        if (!activeConfig) {
          throw new Error(
            "未找到启用且默认的工作流 CDP 连接配置。请先在工作流配置中添加。"
          );
        }

        const action = data.action; // 'navigate' | 'click' | 'input' | 'screenshot' | 'extract'
        const selector = data.selector || "";
        const value = data.value || "";

        // 如果客户端未建立连接，则初始化连接
        if (!cdpClient) {
          let wsUrl = activeConfig.cdpUrl;
          // 如果填写的不是带有 /devtools/ 的完整 ws 调试地址，或者是以 http 开头，我们就通过 HTTP API 获取真正的 webSocketDebuggerUrl
          const needFetchVersion =
            wsUrl.startsWith("http://") ||
            wsUrl.startsWith("https://") ||
            (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) ||
            (wsUrl.startsWith("ws://") && !wsUrl.includes("/devtools/")) ||
            (wsUrl.startsWith("wss://") && !wsUrl.includes("/devtools/"));

          if (needFetchVersion) {
            let hostUrl = wsUrl;
            if (hostUrl.startsWith("ws://")) {
              hostUrl = "http://" + hostUrl.slice(5);
            } else if (hostUrl.startsWith("wss://")) {
              hostUrl = "https://" + hostUrl.slice(6);
            } else if (!hostUrl.startsWith("http")) {
              hostUrl = `http://${hostUrl}`;
            }

            try {
              const res = await fetch(`${hostUrl}/json/version`);
              const versionData = (await res.json()) as {
                webSocketDebuggerUrl?: string;
              };
              if (versionData.webSocketDebuggerUrl) {
                wsUrl = versionData.webSocketDebuggerUrl;
              } else {
                throw new Error("无法从 HTTP 接口解析出 webSocketDebuggerUrl");
              }
            } catch (e: any) {
              throw new Error(
                `连接 CDP 调试地址 ${hostUrl} 失败: ${e.message}`
              );
            }
          }

          cdpClient = new CDPClient(wsUrl);
          await cdpClient.connect();

          // 创建新 Page 页面
          const targetRes = await cdpClient.send("Target.createTarget", {
            url: "about:blank",
          });
          targetId = targetRes.targetId;

          // 关联会话
          const sessionRes = await cdpClient.send("Target.attachToTarget", {
            targetId,
            flatten: true,
          });
          sessionId = sessionRes.sessionId;

          // 激活 Page 域
          await cdpClient.send("Page.enable", {}, sessionId);
        }

        if (action === "navigate") {
          await cdpClient.send("Page.navigate", { url: value }, sessionId);
          // 等待页面完全加载
          let loaded = false;
          for (let i = 0; i < 30; i++) {
            const stateRes = await cdpClient.send(
              "Runtime.evaluate",
              { expression: "document.readyState" },
              sessionId
            );
            if (stateRes?.result?.value === "complete") {
              loaded = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
          await appendStepLog({
            nodeId,
            nodeName,
            type: normalizedType,
            status: "success",
            message: `成功导航到页面: ${value} (加载状态: ${loaded ? "完毕" : "超时"})`,
          });
        } else if (action === "click") {
          const evalRes = await cdpClient.send(
            "Runtime.evaluate",
            {
              expression: `(() => {
              const el = document.querySelector("${selector}");
              if (!el) return "NOT_FOUND";
              el.click();
              return "OK";
            })()`,
            },
            sessionId
          );
          if (evalRes?.result?.value === "NOT_FOUND") {
            throw new Error(`点击目标未找到 Selector: ${selector}`);
          }
          await appendStepLog({
            nodeId,
            nodeName,
            type: normalizedType,
            status: "success",
            message: `成功模拟点击选择器: ${selector}`,
          });
        } else if (action === "input") {
          const escapedVal = value
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n");
          const evalRes = await cdpClient.send(
            "Runtime.evaluate",
            {
              expression: `(() => {
              const el = document.querySelector("${selector}");
              if (!el) return "NOT_FOUND";
              el.value = "${escapedVal}";
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return "OK";
            })()`,
            },
            sessionId
          );
          if (evalRes?.result?.value === "NOT_FOUND") {
            throw new Error(`输入目标未找到 Selector: ${selector}`);
          }
          await appendStepLog({
            nodeId,
            nodeName,
            type: normalizedType,
            status: "success",
            message: `成功向输入框 ${selector} 填入内容`,
          });
        } else if (action === "screenshot") {
          const shotRes = await cdpClient.send(
            "Page.captureScreenshot",
            { format: "png" },
            sessionId
          );
          await appendStepLog({
            nodeId,
            nodeName,
            type: normalizedType,
            status: "success",
            message: "页面抓图成功",
            screenshot: shotRes.data, // base64
          });
        } else if (action === "extract") {
          const evalRes = await cdpClient.send(
            "Runtime.evaluate",
            {
              expression: selector
                ? `document.querySelector("${selector}")?.innerText || ""`
                : `document.body.innerText`,
            },
            sessionId
          );
          const extractedText = evalRes?.result?.value || "";
          await appendStepLog({
            nodeId,
            nodeName,
            type: normalizedType,
            status: "success",
            message: `提取内容成功，提取数据前100字符: "${extractedText.substring(0, 100)}..."`,
          });
        } else if (action === "evaluate") {
          // 在浏览器页面上执行自定义 JS（通过 CDP Runtime.evaluate，不在服务端运行）
          const code = (data.code || "").trim();
          let expression = code;
          if (
            expression.includes("return") ||
            expression.includes("\n") ||
            expression.includes(";")
          ) {
            expression = `(async () => {
${expression}
})()`;
          }

          const evalRes = await cdpClient.send(
            "Runtime.evaluate",
            {
              expression,
              returnByValue: true,
              awaitPromise: true,
            },
            sessionId
          );

          if (evalRes?.exceptionDetails) {
            const exceptionMsg =
              evalRes.exceptionDetails.exception?.description ||
              evalRes.exceptionDetails.text ||
              JSON.stringify(evalRes.exceptionDetails);
            throw new Error(`页面脚本运行异常: ${exceptionMsg}`);
          }
          const returnVal = evalRes?.result?.value;
          await appendStepLog({
            nodeId,
            nodeName,
            type: normalizedType,
            status: "success",
            message: `页面脚本执行成功。`,
            result: returnVal,
          });
        }
      } else if (normalizedType === "docker") {
        // Docker 任务节点
        const image = data.image || "alpine";
        const cmdString = data.command || "";
        const args = cmdString ? cmdString.split(" ") : [];

        const serviceName = `workflow-task-${nodeId}-${Date.now()}`;

        await appendStepLog({
          nodeId,
          nodeName,
          type: normalizedType,
          status: "success",
          message: `正在 Docker 集群中拉起任务容器 (镜像: ${image}, 任务名: ${serviceName})...`,
        });

        // 构造 Docker Swarm 任务 spec
        const spec = {
          Name: serviceName,
          TaskTemplate: {
            ContainerSpec: {
              Image: image,
              Args: args.length > 0 ? args : undefined,
            },
            RestartPolicy: {
              Condition: "none", // 任务节点只跑一次
            },
          },
        };

        // 创建服务
        const createRes = await dockerClient.createService(spec);
        const serviceId = createRes.ID;

        // 轮询服务运行状态，最大等待 5 分钟
        let isDone = false;
        let finalStatus = "unknown";
        for (let i = 0; i < 150; i++) {
          // 2s * 150 = 300s
          await new Promise((r) => setTimeout(r, 2000));
          try {
            // 获取任务详情
            const tasks = await dockerClient.listTasks({
              service: [serviceName],
            });
            if (tasks.length > 0) {
              const task = tasks[0];
              const state = task.Status?.State; // 'new' | 'running' | 'complete' | 'failed'
              if (
                state === "complete" ||
                state === "failed" ||
                state === "rejected" ||
                state === "shutdown"
              ) {
                isDone = true;
                finalStatus = state;
                break;
              }
            }
          } catch (err) {
            // 静默处理，可能是服务刚建好还没分配任务
          }
        }

        if (!isDone) {
          // 超时处理
          await dockerClient.removeService(serviceId);
          throw new Error("Docker Swarm 任务运行超时(5分钟)。");
        }

        // 获取输出日志
        let taskLogs = "无日志输出。";
        try {
          taskLogs = await dockerClient.getServiceLogs(serviceName, 200);
        } catch (e) {}

        // 删除服务释放资源
        await dockerClient.removeService(serviceId);

        if (finalStatus === "failed" || finalStatus === "rejected") {
          throw new Error(
            `Docker 任务运行失败，最终状态: ${finalStatus}。日志: ${taskLogs}`
          );
        }

        await appendStepLog({
          nodeId,
          nodeName,
          type: normalizedType,
          status: "success",
          message: `Docker 任务执行成功。容器日志:\n${taskLogs}`,
        });
      }

      // 寻下一节点
      const nextEdge = edges.find((e: any) => e.source === currentNode.id);
      if (nextEdge) {
        currentNode = nodes.find((n: any) => n.id === nextEdge.target);
      } else {
        currentNode = null;
      }
    }

    // 运行成功，标志日志
    if (logId) {
      await onLogUpdate(logId, {
        status: "success",
        endTimeUtc: Date.now(),
      });
    }
  } catch (err: any) {
    console.error(`[Workflow Engine] Execute error:`, err);
    const errMsg =
      err?.message ||
      (err && typeof err === "object" ? JSON.stringify(err) : String(err));
    await appendStepLog({
      nodeId: "error",
      nodeName: "引擎异常捕获",
      type: "system",
      status: "failed",
      message: `工作流执行被中断并异常退出。错误信息: ${errMsg}`,
    });

    if (logId) {
      await onLogUpdate(logId, {
        status: "failed",
        endTimeUtc: Date.now(),
      });
    }
  } finally {
    // 垃圾回收，关闭 CDP 连接
    if (cdpClient) {
      if (targetId) {
        try {
          await cdpClient.send("Target.closeTarget", { targetId });
        } catch (e) {}
      }
      cdpClient.close();
    }
  }
}
