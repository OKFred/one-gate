import type { BatchTranslationItem } from "@/db/initTranslation";

export const swarmTranslations: BatchTranslationItem[] = [
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置名称",
      "en-US": "Config Name",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.host",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Docker Host 地址",
      "en-US": "Docker Host",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.hostPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "tcp://127.0.0.1:2376 或 https://192.168.1.100:2376",
      "en-US": "tcp://127.0.0.1:2376 or https://192.168.1.100:2376",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.tlsVerify",
    isEnabled: true,
    langCodes: {
      "zh-CN": "启用 TLS 验证",
      "en-US": "Enable TLS",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.isDefault",
    isEnabled: true,
    langCodes: {
      "zh-CN": "默认配置",
      "en-US": "Default",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.isDefaultForm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "设为默认配置",
      "en-US": "Set as Default",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.defaultLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "默认",
      "en-US": "Default",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.apiVersion",
    isEnabled: true,
    langCodes: {
      "zh-CN": "API 版本 (例如: v1.45)",
      "en-US": "API Version (e.g. v1.45)",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.cfMtlsBinding",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Cloudflare mTLS 证书绑定名称 (仅在 CF Worker 下生效)",
      "en-US": "Cloudflare mTLS Binding Name (CF Worker only)",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.cfMtlsBindingPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "mtls-docker",
      "en-US": "mtls-docker",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.caCert",
    isEnabled: true,
    langCodes: {
      "zh-CN": "CA 证书 (ca.pem)",
      "en-US": "CA Cert (ca.pem)",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.clientCert",
    isEnabled: true,
    langCodes: {
      "zh-CN": "客户端证书 (cert.pem)",
      "en-US": "Client Cert (cert.pem)",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.clientKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "客户端私钥 (key.pem)",
      "en-US": "Client Key (key.pem)",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.verifySuccess",
    isEnabled: true,
    langCodes: {
      "zh-CN": "连接验证成功",
      "en-US": "Connection verified successfully",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.verifyError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "连接验证异常",
      "en-US": "Connection verification error",
    },
  },
  {
    application: "frontend",
    business: "swarm.docker_config",
    tKey: "swarm.docker_config.actions.verify",
    isEnabled: true,
    langCodes: {
      "zh-CN": "测试连通性",
      "en-US": "Test Connection",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "sidebar.menu.swarm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "集群管理",
      "en-US": "Swarm Cluster",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "sidebar.menu.swarm.docker",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Docker",
      "en-US": "Docker",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Docker Swarm 服务",
      "en-US": "Docker Swarm Services",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.pause",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂停服务",
      "en-US": "Pause Service",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.play",
    isEnabled: true,
    langCodes: {
      "zh-CN": "恢复服务",
      "en-US": "Resume Service",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.searchPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入服务名称筛选...",
      "en-US": "Enter service name to filter...",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.searchLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "服务名称搜索",
      "en-US": "Service Name Search",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.id",
    isEnabled: true,
    langCodes: {
      "zh-CN": "服务 ID",
      "en-US": "Service ID",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "服务名称",
      "en-US": "Service Name",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.image",
    isEnabled: true,
    langCodes: {
      "zh-CN": "容器镜像",
      "en-US": "Container Image",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.replicas",
    isEnabled: true,
    langCodes: {
      "zh-CN": "副本数",
      "en-US": "Replicas",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.createdAt",
    isEnabled: true,
    langCodes: {
      "zh-CN": "创建时间",
      "en-US": "Created Time",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.detailTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Swarm 服务配置详情",
      "en-US": "Swarm Service Configuration Detail",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.environment",
    isEnabled: true,
    langCodes: {
      "zh-CN": "容器运行环境变量",
      "en-US": "Container Environment Variables",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.addEnv",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加环境变量",
      "en-US": "Add Environment Variable",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.key",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键名 (Key)",
      "en-US": "Variable Key",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.value",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键值 (Value)",
      "en-US": "Variable Value",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.globalMode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "全局调度模式 (Global)",
      "en-US": "Global Mode (Scheduler)",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.namePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: web-nginx",
      "en-US": "e.g. web-nginx",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.imagePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: nginx:latest",
      "en-US": "e.g. nginx:latest",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.keyPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键名",
      "en-US": "Variable Key",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.valuePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键值",
      "en-US": "Variable Value",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noEnv",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂未添加任何环境变量",
      "en-US": "No environment variables added yet",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.basicInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基本信息",
      "en-US": "Basic Information",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.version",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置版本",
      "en-US": "Configuration Version",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.updatedAt",
    isEnabled: true,
    langCodes: {
      "zh-CN": "更新时间",
      "en-US": "Updated Time",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.rawConfig",
    isEnabled: true,
    langCodes: {
      "zh-CN": "原始配置 JSON",
      "en-US": "Raw Configuration JSON",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.close",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关闭",
      "en-US": "Close",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.ports",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暴露端口映射 (Port Mappings)",
      "en-US": "Port Exposure Mappings",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.addPort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加端口映射",
      "en-US": "Add Port Mapping",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.pubPort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "外部发布端口",
      "en-US": "Published Port",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.targetPort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "内部容器端口",
      "en-US": "Target Container Port",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.protocol",
    isEnabled: true,
    langCodes: {
      "zh-CN": "网络协议",
      "en-US": "Protocol",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.pubPortPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: 80",
      "en-US": "e.g. 80",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.targetPortPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: 80",
      "en-US": "e.g. 80",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noPorts",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂未公开任何容器端口",
      "en-US": "No ports exposed yet",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.refresh",
    isEnabled: true,
    langCodes: {
      "zh-CN": "刷新数据",
      "en-US": "Refresh Data",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.tailLines",
    isEnabled: true,
    langCodes: {
      "zh-CN": "日志行数",
      "en-US": "Tail Lines",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.loadingLogs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "正在拉取服务日志...",
      "en-US": "Fetching service logs...",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noLogs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前服务暂无任何日志输出",
      "en-US": "No logs output found for this service",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.metrics",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运行负载",
      "en-US": "Runtime Metrics",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.cpuUsage",
    isEnabled: true,
    langCodes: {
      "zh-CN": "CPU 使用率",
      "en-US": "CPU Usage",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.memUsage",
    isEnabled: true,
    langCodes: {
      "zh-CN": "内存占用",
      "en-US": "Memory Usage",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.netTraffic",
    isEnabled: true,
    langCodes: {
      "zh-CN": "网络流量",
      "en-US": "Network Traffic",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.diskIO",
    isEnabled: true,
    langCodes: {
      "zh-CN": "磁盘 I/O",
      "en-US": "Disk I/O",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.rx",
    isEnabled: true,
    langCodes: {
      "zh-CN": "入流量",
      "en-US": "Inbound (Rx)",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.tx",
    isEnabled: true,
    langCodes: {
      "zh-CN": "出流量",
      "en-US": "Outbound (Tx)",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.read",
    isEnabled: true,
    langCodes: {
      "zh-CN": "读取",
      "en-US": "Read",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.write",
    isEnabled: true,
    langCodes: {
      "zh-CN": "写入",
      "en-US": "Write",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.loadingMetrics",
    isEnabled: true,
    langCodes: {
      "zh-CN": "正在收集实时负载指标...",
      "en-US": "Fetching real-time metrics...",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noMetrics",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未能成功收集负载，可能任务副本正处于休眠或迁移中",
      "en-US":
        "No metrics available. The tasks might be starting or migrating.",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.taskId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务实例",
      "en-US": "Task Instance",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.logsTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "容器日志控制台",
      "en-US": "Container Logs Console",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "sidebar.menu.swarm.nodes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点列表",
      "en-US": "Nodes",
    },
  },
  {
    application: "backend",
    business: "swarm",
    tKey: "businessType.swarm.nodes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Swarm 节点管理",
      "en-US": "Swarm Nodes",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.id",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点 ID",
      "en-US": "Node ID",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.hostname",
    isEnabled: true,
    langCodes: {
      "zh-CN": "主机名称",
      "en-US": "Hostname",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.role",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点角色",
      "en-US": "Role",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点状态",
      "en-US": "Status",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.availability",
    isEnabled: true,
    langCodes: {
      "zh-CN": "调度可用性",
      "en-US": "Availability",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.ip",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点 IP",
      "en-US": "IP Address",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.engineVersion",
    isEnabled: true,
    langCodes: {
      "zh-CN": "引擎版本",
      "en-US": "Engine Version",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.cpus",
    isEnabled: true,
    langCodes: {
      "zh-CN": "CPU 核心",
      "en-US": "CPU Cores",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.memory",
    isEnabled: true,
    langCodes: {
      "zh-CN": "物理内存",
      "en-US": "Memory",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.taskCount",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运行副本数",
      "en-US": "Running Tasks",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.allocatedCpus",
    isEnabled: true,
    langCodes: {
      "zh-CN": "已分配 CPU",
      "en-US": "Allocated CPUs",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.allocatedMemory",
    isEnabled: true,
    langCodes: {
      "zh-CN": "已分配内存",
      "en-US": "Allocated Memory",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.allocatedRatio",
    isEnabled: true,
    langCodes: {
      "zh-CN": "分配率",
      "en-US": "Allocation Ratio",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.manager",
    isEnabled: true,
    langCodes: {
      "zh-CN": "管理节点",
      "en-US": "Manager",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.worker",
    isEnabled: true,
    langCodes: {
      "zh-CN": "工作节点",
      "en-US": "Worker",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.active",
    isEnabled: true,
    langCodes: {
      "zh-CN": "激活调度",
      "en-US": "Active",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.drain",
    isEnabled: true,
    langCodes: {
      "zh-CN": "下线排空",
      "en-US": "Drain",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.pause",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂停调度",
      "en-US": "Pause",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.ready",
    isEnabled: true,
    langCodes: {
      "zh-CN": "就绪",
      "en-US": "Ready",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.down",
    isEnabled: true,
    langCodes: {
      "zh-CN": "离线",
      "en-US": "Down",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.disconnected",
    isEnabled: true,
    langCodes: {
      "zh-CN": "断开连接",
      "en-US": "Disconnected",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.details",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点详细配置",
      "en-US": "Node JSON Details",
    },
  },
];
