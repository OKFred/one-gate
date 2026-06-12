import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const swarmTranslations = {
  "swarm.docker_config": [
    {
      tKey: "swarm.docker_config.name",
      langCodes: {
        "zh-CN": "配置名称",
        "en-US": "Config Name",
      },
    },
    {
      tKey: "swarm.docker_config.host",
      langCodes: {
        "zh-CN": "Docker Host 地址",
        "en-US": "Docker Host",
      },
    },
    {
      tKey: "swarm.docker_config.hostPlaceholder",
      langCodes: {
        "zh-CN": "tcp://127.0.0.1:2376 或 https://192.168.1.100:2376",
        "en-US": "tcp://127.0.0.1:2376 or https://192.168.1.100:2376",
      },
    },
    {
      tKey: "swarm.docker_config.tlsVerify",
      langCodes: {
        "zh-CN": "启用 TLS 验证",
        "en-US": "Enable TLS",
      },
    },
    {
      tKey: "swarm.docker_config.isDefault",
      langCodes: {
        "zh-CN": "默认配置",
        "en-US": "Default",
      },
    },
    {
      tKey: "swarm.docker_config.isDefaultForm",
      langCodes: {
        "zh-CN": "设为默认配置",
        "en-US": "Set as Default",
      },
    },
    {
      tKey: "swarm.docker_config.defaultLabel",
      langCodes: {
        "zh-CN": "默认",
        "en-US": "Default",
      },
    },
    {
      tKey: "swarm.docker_config.apiVersion",
      langCodes: {
        "zh-CN": "API 版本 (例如: v1.45)",
        "en-US": "API Version (e.g. v1.45)",
      },
    },
    {
      tKey: "swarm.docker_config.cfMtlsBinding",
      langCodes: {
        "zh-CN": "Cloudflare mTLS 证书绑定名称 (仅在 CF Worker 下生效)",
        "en-US": "Cloudflare mTLS Binding Name (CF Worker only)",
      },
    },
    {
      tKey: "swarm.docker_config.cfMtlsBindingPlaceholder",
      langCodes: {
        "zh-CN": "mtls-docker",
        "en-US": "mtls-docker",
      },
    },
    {
      tKey: "swarm.docker_config.caCert",
      langCodes: {
        "zh-CN": "CA 证书 (ca.pem)",
        "en-US": "CA Cert (ca.pem)",
      },
    },
    {
      tKey: "swarm.docker_config.clientCert",
      langCodes: {
        "zh-CN": "客户端证书 (cert.pem)",
        "en-US": "Client Cert (cert.pem)",
      },
    },
    {
      tKey: "swarm.docker_config.clientKey",
      langCodes: {
        "zh-CN": "客户端私钥 (key.pem)",
        "en-US": "Client Key (key.pem)",
      },
    },
    {
      tKey: "swarm.docker_config.verifySuccess",
      langCodes: {
        "zh-CN": "连接验证成功",
        "en-US": "Connection verified successfully",
      },
    },
    {
      tKey: "swarm.docker_config.verifyError",
      langCodes: {
        "zh-CN": "连接验证异常",
        "en-US": "Connection verification error",
      },
    },
    {
      tKey: "swarm.docker_config.actions.verify",
      langCodes: {
        "zh-CN": "测试连通性",
        "en-US": "Test Connection",
      },
    },
  ],
  swarm: [
    {
      tKey: "sidebar.menu.swarm",
      langCodes: {
        "zh-CN": "集群管理",
        "en-US": "Swarm Cluster",
      },
    },
    {
      tKey: "sidebar.menu.swarm.docker",
      langCodes: {
        "zh-CN": "Docker",
        "en-US": "Docker",
      },
    },
    {
      tKey: "swarm.docker.title",
      langCodes: {
        "zh-CN": "Docker Swarm 服务",
        "en-US": "Docker Swarm Services",
      },
    },
    {
      tKey: "swarm.docker.pause",
      langCodes: {
        "zh-CN": "暂停服务",
        "en-US": "Pause Service",
      },
    },
    {
      tKey: "swarm.docker.play",
      langCodes: {
        "zh-CN": "恢复服务",
        "en-US": "Resume Service",
      },
    },
    {
      tKey: "swarm.docker.searchPlaceholder",
      langCodes: {
        "zh-CN": "输入服务名称筛选...",
        "en-US": "Enter service name to filter...",
      },
    },
    {
      tKey: "swarm.docker.searchLabel",
      langCodes: {
        "zh-CN": "服务名称搜索",
        "en-US": "Service Name Search",
      },
    },
    {
      tKey: "swarm.docker.id",
      langCodes: {
        "zh-CN": "服务 ID",
        "en-US": "Service ID",
      },
    },
    {
      tKey: "swarm.docker.name",
      langCodes: {
        "zh-CN": "服务名称",
        "en-US": "Service Name",
      },
    },
    {
      tKey: "swarm.docker.image",
      langCodes: {
        "zh-CN": "容器镜像",
        "en-US": "Container Image",
      },
    },
    {
      tKey: "swarm.docker.replicas",
      langCodes: {
        "zh-CN": "副本数",
        "en-US": "Replicas",
      },
    },
    {
      tKey: "swarm.docker.createdAt",
      langCodes: {
        "zh-CN": "创建时间",
        "en-US": "Created Time",
      },
    },
    {
      tKey: "swarm.docker.detailTitle",
      langCodes: {
        "zh-CN": "Swarm 服务配置详情",
        "en-US": "Swarm Service Configuration Detail",
      },
    },
    {
      tKey: "swarm.docker.environment",
      langCodes: {
        "zh-CN": "容器运行环境变量",
        "en-US": "Container Environment Variables",
      },
    },
    {
      tKey: "swarm.docker.addEnv",
      langCodes: {
        "zh-CN": "添加环境变量",
        "en-US": "Add Environment Variable",
      },
    },
    {
      tKey: "swarm.docker.key",
      langCodes: {
        "zh-CN": "变量键名 (Key)",
        "en-US": "Variable Key",
      },
    },
    {
      tKey: "swarm.docker.value",
      langCodes: {
        "zh-CN": "变量键值 (Value)",
        "en-US": "Variable Value",
      },
    },
    {
      tKey: "swarm.docker.globalMode",
      langCodes: {
        "zh-CN": "全局调度模式 (Global)",
        "en-US": "Global Mode (Scheduler)",
      },
    },
    {
      tKey: "swarm.docker.namePlaceholder",
      langCodes: {
        "zh-CN": "例如: web-nginx",
        "en-US": "e.g. web-nginx",
      },
    },
    {
      tKey: "swarm.docker.imagePlaceholder",
      langCodes: {
        "zh-CN": "例如: nginx:latest",
        "en-US": "e.g. nginx:latest",
      },
    },
    {
      tKey: "swarm.docker.keyPlaceholder",
      langCodes: {
        "zh-CN": "变量键名",
        "en-US": "Variable Key",
      },
    },
    {
      tKey: "swarm.docker.valuePlaceholder",
      langCodes: {
        "zh-CN": "变量键值",
        "en-US": "Variable Value",
      },
    },
    {
      tKey: "swarm.docker.noEnv",
      langCodes: {
        "zh-CN": "暂未添加任何环境变量",
        "en-US": "No environment variables added yet",
      },
    },
    {
      tKey: "swarm.docker.basicInfo",
      langCodes: {
        "zh-CN": "基本信息",
        "en-US": "Basic Information",
      },
    },
    {
      tKey: "swarm.docker.version",
      langCodes: {
        "zh-CN": "配置版本",
        "en-US": "Configuration Version",
      },
    },
    {
      tKey: "swarm.docker.updatedAt",
      langCodes: {
        "zh-CN": "更新时间",
        "en-US": "Updated Time",
      },
    },
    {
      tKey: "swarm.docker.rawConfig",
      langCodes: {
        "zh-CN": "原始配置 JSON",
        "en-US": "Raw Configuration JSON",
      },
    },
    {
      tKey: "swarm.docker.close",
      langCodes: {
        "zh-CN": "关闭",
        "en-US": "Close",
      },
    },
    {
      tKey: "swarm.docker.ports",
      langCodes: {
        "zh-CN": "暴露端口映射 (Port Mappings)",
        "en-US": "Port Exposure Mappings",
      },
    },
    {
      tKey: "swarm.docker.addPort",
      langCodes: {
        "zh-CN": "添加端口映射",
        "en-US": "Add Port Mapping",
      },
    },
    {
      tKey: "swarm.docker.pubPort",
      langCodes: {
        "zh-CN": "外部发布端口",
        "en-US": "Published Port",
      },
    },
    {
      tKey: "swarm.docker.targetPort",
      langCodes: {
        "zh-CN": "内部容器端口",
        "en-US": "Target Container Port",
      },
    },
    {
      tKey: "swarm.docker.protocol",
      langCodes: {
        "zh-CN": "网络协议",
        "en-US": "Protocol",
      },
    },
    {
      tKey: "swarm.docker.pubPortPlaceholder",
      langCodes: {
        "zh-CN": "例如: 80",
        "en-US": "e.g. 80",
      },
    },
    {
      tKey: "swarm.docker.targetPortPlaceholder",
      langCodes: {
        "zh-CN": "例如: 80",
        "en-US": "e.g. 80",
      },
    },
    {
      tKey: "swarm.docker.noPorts",
      langCodes: {
        "zh-CN": "暂未公开任何容器端口",
        "en-US": "No ports exposed yet",
      },
    },
    {
      tKey: "swarm.docker.refresh",
      langCodes: {
        "zh-CN": "刷新数据",
        "en-US": "Refresh Data",
      },
    },
    {
      tKey: "swarm.docker.tailLines",
      langCodes: {
        "zh-CN": "日志行数",
        "en-US": "Tail Lines",
      },
    },
    {
      tKey: "swarm.docker.loadingLogs",
      langCodes: {
        "zh-CN": "正在拉取服务日志...",
        "en-US": "Fetching service logs...",
      },
    },
    {
      tKey: "swarm.docker.noLogs",
      langCodes: {
        "zh-CN": "当前服务暂无任何日志输出",
        "en-US": "No logs output found for this service",
      },
    },
    {
      tKey: "swarm.docker.metrics",
      langCodes: {
        "zh-CN": "运行负载",
        "en-US": "Runtime Metrics",
      },
    },
    {
      tKey: "swarm.docker.cpuUsage",
      langCodes: {
        "zh-CN": "CPU 使用率",
        "en-US": "CPU Usage",
      },
    },
    {
      tKey: "swarm.docker.memUsage",
      langCodes: {
        "zh-CN": "内存占用",
        "en-US": "Memory Usage",
      },
    },
    {
      tKey: "swarm.docker.netTraffic",
      langCodes: {
        "zh-CN": "网络流量",
        "en-US": "Network Traffic",
      },
    },
    {
      tKey: "swarm.docker.diskIO",
      langCodes: {
        "zh-CN": "磁盘 I/O",
        "en-US": "Disk I/O",
      },
    },
    {
      tKey: "swarm.docker.rx",
      langCodes: {
        "zh-CN": "入流量",
        "en-US": "Inbound (Rx)",
      },
    },
    {
      tKey: "swarm.docker.tx",
      langCodes: {
        "zh-CN": "出流量",
        "en-US": "Outbound (Tx)",
      },
    },
    {
      tKey: "swarm.docker.read",
      langCodes: {
        "zh-CN": "读取",
        "en-US": "Read",
      },
    },
    {
      tKey: "swarm.docker.write",
      langCodes: {
        "zh-CN": "写入",
        "en-US": "Write",
      },
    },
    {
      tKey: "swarm.docker.loadingMetrics",
      langCodes: {
        "zh-CN": "正在收集实时负载指标...",
        "en-US": "Fetching real-time metrics...",
      },
    },
    {
      tKey: "swarm.docker.noMetrics",
      langCodes: {
        "zh-CN": "未能成功收集负载，可能任务副本正处于休眠或迁移中",
        "en-US":
          "No metrics available. The tasks might be starting or migrating.",
      },
    },
    {
      tKey: "swarm.docker.taskId",
      langCodes: {
        "zh-CN": "任务实例",
        "en-US": "Task Instance",
      },
    },
    {
      tKey: "swarm.docker.logsTitle",
      langCodes: {
        "zh-CN": "容器日志控制台",
        "en-US": "Container Logs Console",
      },
    },
    {
      tKey: "sidebar.menu.swarm.nodes",
      langCodes: {
        "zh-CN": "节点列表",
        "en-US": "Nodes",
      },
    },
    {
      application: "backend",
      tKey: "businessType.swarm.nodes",
      langCodes: {
        "zh-CN": "Swarm 节点管理",
        "en-US": "Swarm Nodes",
      },
    },
    {
      tKey: "swarm.nodes.id",
      langCodes: {
        "zh-CN": "节点 ID",
        "en-US": "Node ID",
      },
    },
    {
      tKey: "swarm.nodes.hostname",
      langCodes: {
        "zh-CN": "主机名称",
        "en-US": "Hostname",
      },
    },
    {
      tKey: "swarm.nodes.role",
      langCodes: {
        "zh-CN": "节点角色",
        "en-US": "Role",
      },
    },
    {
      tKey: "swarm.nodes.status",
      langCodes: {
        "zh-CN": "节点状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "swarm.nodes.availability",
      langCodes: {
        "zh-CN": "调度可用性",
        "en-US": "Availability",
      },
    },
    {
      tKey: "swarm.nodes.ip",
      langCodes: {
        "zh-CN": "节点 IP",
        "en-US": "IP Address",
      },
    },
    {
      tKey: "swarm.nodes.engineVersion",
      langCodes: {
        "zh-CN": "引擎版本",
        "en-US": "Engine Version",
      },
    },
    {
      tKey: "swarm.nodes.cpus",
      langCodes: {
        "zh-CN": "CPU 核心",
        "en-US": "CPU Cores",
      },
    },
    {
      tKey: "swarm.nodes.memory",
      langCodes: {
        "zh-CN": "物理内存",
        "en-US": "Memory",
      },
    },
    {
      tKey: "swarm.nodes.taskCount",
      langCodes: {
        "zh-CN": "运行副本数",
        "en-US": "Running Tasks",
      },
    },
    {
      tKey: "swarm.nodes.allocatedCpus",
      langCodes: {
        "zh-CN": "已分配 CPU",
        "en-US": "Allocated CPUs",
      },
    },
    {
      tKey: "swarm.nodes.allocatedMemory",
      langCodes: {
        "zh-CN": "已分配内存",
        "en-US": "Allocated Memory",
      },
    },
    {
      tKey: "swarm.nodes.allocatedRatio",
      langCodes: {
        "zh-CN": "分配率",
        "en-US": "Allocation Ratio",
      },
    },
    {
      tKey: "swarm.nodes.manager",
      langCodes: {
        "zh-CN": "管理节点",
        "en-US": "Manager",
      },
    },
    {
      tKey: "swarm.nodes.worker",
      langCodes: {
        "zh-CN": "工作节点",
        "en-US": "Worker",
      },
    },
    {
      tKey: "swarm.nodes.active",
      langCodes: {
        "zh-CN": "激活调度",
        "en-US": "Active",
      },
    },
    {
      tKey: "swarm.nodes.drain",
      langCodes: {
        "zh-CN": "下线排空",
        "en-US": "Drain",
      },
    },
    {
      tKey: "swarm.nodes.pause",
      langCodes: {
        "zh-CN": "暂停调度",
        "en-US": "Pause",
      },
    },
    {
      tKey: "swarm.nodes.ready",
      langCodes: {
        "zh-CN": "就绪",
        "en-US": "Ready",
      },
    },
    {
      tKey: "swarm.nodes.down",
      langCodes: {
        "zh-CN": "离线",
        "en-US": "Down",
      },
    },
    {
      tKey: "swarm.nodes.disconnected",
      langCodes: {
        "zh-CN": "断开连接",
        "en-US": "Disconnected",
      },
    },
    {
      tKey: "swarm.nodes.details",
      langCodes: {
        "zh-CN": "节点详细配置",
        "en-US": "Node JSON Details",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "swarm.docker_config" | "swarm">,
  TranslationInputItem[]
>;
