import { env } from "cloudflare:workers";
import { setD1Binding } from "@/db/index";
import { setKVBinding } from "@/middleware/cache";

// 在测试沙箱启动时，自动绑定 D1 数据库和 KV 缓存
setD1Binding(env.DB);
setKVBinding(env.KV);
