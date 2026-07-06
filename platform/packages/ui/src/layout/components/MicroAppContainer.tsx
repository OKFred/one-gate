import React, { useEffect, useState, Suspense } from 'react';
import { registerRemotes, loadRemote } from '@module-federation/enhanced/runtime';

interface MicroAppContainerProps {
  scope: 'enterprise' | 'personal';
  visible: boolean;
}

const componentCache: Record<string, React.ComponentType<Record<string, unknown>>> = {};

export const MicroAppContainer: React.FC<MicroAppContainerProps> = ({ scope, visible }) => {
  const [FederatedComponent, setFederatedComponent] = useState<React.ComponentType<
    Record<string, unknown>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 计算子系统的 Base URL
  const getSubAppBaseUrl = (scopeName: string) => {
    if (import.meta.env.DEV) {
      const ports: Record<string, number> = {
        admin: 5173,
        enterprise: 5174,
        personal: 5175,
      };
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      return `${protocol}//${hostname}:${ports[scopeName] || 5173}`;
    } else {
      const metaEnv = (import.meta as unknown as { env: Record<string, string> }).env;
      if (scopeName === 'enterprise' && metaEnv.VITE_ENTERPRISE_URL) {
        return metaEnv.VITE_ENTERPRISE_URL;
      }
      if (scopeName === 'personal' && metaEnv.VITE_PERSONAL_URL) {
        return metaEnv.VITE_PERSONAL_URL;
      }

      // 如果未配置环境变量，则根据当前访问的域名进行智能推导 (支持 Pages.dev 默认多项目域名或子域名切换)
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;

      // 匹配 Cloudflare Pages 默认多项目结构: e.g. gate-admin.pages.dev -> gate-enterprise.pages.dev
      if (hostname.endsWith('.pages.dev')) {
        const baseName = hostname.replace(/\.pages\.dev$/, '');
        const cleanBase = baseName.replace(/-(admin|enterprise|personal)$/, '');
        return `${protocol}//${cleanBase}-${scopeName}.pages.dev`;
      }

      // 匹配自定义二级域名结构: e.g. admin.example.com -> enterprise.example.com
      if (hostname.includes('.')) {
        const parts = hostname.split('.');
        if (parts[0] === 'admin' || parts[0] === 'enterprise' || parts[0] === 'personal') {
          parts[0] = scopeName;
          return `${protocol}//${parts.join('.')}`;
        }
      }

      return scopeName === 'admin' ? '/' : `/${scopeName}`;
    }
  };

  const baseUrl = getSubAppBaseUrl(scope);

  useEffect(() => {
    if (componentCache[scope]) {
      setFederatedComponent(() => componentCache[scope]);
      return;
    }

    const loadApp = async () => {
      try {
        const entryUrl = `${baseUrl}/remoteEntry.js`;
        console.log(`[ModuleFederation] Initializing remote app ${scope} at ${entryUrl}`);

        // 注册 Module Federation 运行时
        registerRemotes([
          {
            name: scope,
            entry: entryUrl,
            type: 'module',
          },
        ]);

        const module = await loadRemote(`${scope}/App`);
        const Component = (module as { default: React.ComponentType<Record<string, unknown>> }).default;
        componentCache[scope] = Component;
        setFederatedComponent(() => Component);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[ModuleFederation] Failed to load remote app ${scope}:`, err);
        setError(errorMsg || `Failed to load micro-frontend application: ${scope}`);
      }
    };

    loadApp();
  }, [scope, baseUrl]);

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          color: '#ef4444',
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          border: '1px solid #fca5a5',
          margin: 16,
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>加载微应用失败</h4>
        <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
      </div>
    );
  }

  if (!FederatedComponent) {
    return (
      <div
        style={{
          display: visible ? 'flex' : 'none',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: 200,
        }}
      >
        <span style={{ fontSize: 14, color: '#6b7280' }}>正在载入微模块...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: visible ? 'block' : 'none',
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              minHeight: 200,
            }}
          >
            <span style={{ fontSize: 14, color: '#6b7280' }}>正在载入微模块...</span>
          </div>
        }
      >
        <FederatedComponent />
      </Suspense>
    </div>
  );
};
