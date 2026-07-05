import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface MicroAppContainerProps {
  scope: 'enterprise' | 'personal';
  visible: boolean;
}

export const MicroAppContainer: React.FC<MicroAppContainerProps> = ({ scope, visible }) => {
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeSrc, setIframeSrc] = useState<string>('');
  const lastSentPathRef = useRef<string>('');
  const isLoadedRef = useRef<boolean>(false);

  // 计算子系统的 Base URL
  const getSubAppBaseUrl = (scopeName: string) => {
    if (import.meta.env.DEV) {
      const ports: Record<string, number> = {
        admin: 5173,
        enterprise: 5174,
        personal: 5175,
      };
      return `http://localhost:${ports[scopeName] || 5173}`;
    } else {
      return scopeName === 'admin' ? '/' : `/${scopeName}`;
    }
  };

  const baseUrl = getSubAppBaseUrl(scope);

  // 计算安全可信的 Origin 用于跨源安全校验，支持端口、二级域名、子目录等各种部署结构
  const targetOrigin = React.useMemo(() => {
    if (baseUrl.startsWith('/')) {
      return window.location.origin;
    }
    try {
      return new URL(baseUrl).origin;
    } catch (e) {
      return window.location.origin;
    }
  }, [baseUrl]);

  // 初始化加载 iframe src (当组件可见，且尚未加载过时才初始化)
  useEffect(() => {
    if (visible && !isLoadedRef.current) {
      isLoadedRef.current = true;
      const token = localStorage.getItem('token') || '';
      // 注意：由于是第一次加载，路由应该取当前浏览器的地址
      const currentPath = location.pathname + location.search;
      const separator = currentPath.includes('?') ? '&' : '?';
      const ssoTokenParam = token ? `${separator}token=${encodeURIComponent(token)}` : '';
      
      const targetUrl = `${baseUrl}/#${currentPath}${ssoTokenParam}`;
      setIframeSrc(targetUrl);
      lastSentPathRef.current = currentPath;
    }
  }, [visible, baseUrl, location.pathname]);

  // 当宿主路由变化，且是同系统内的子路由切换时，只通过 postMessage 同步，避免 iframe 强刷
  useEffect(() => {
    if (!visible || !isLoadedRef.current) return;
    
    const currentPath = location.pathname + location.search;
    // 检查这个路径是否属于当前 scope 的路径，如果是才同步给子应用
    const isTargetRoute = (scope === 'enterprise' && currentPath.startsWith('/biz/')) ||
                          (scope === 'personal' && currentPath.startsWith('/personal/'));
                          
    if (
      isTargetRoute &&
      iframeRef.current?.contentWindow && 
      lastSentPathRef.current !== currentPath
    ) {
      lastSentPathRef.current = currentPath;
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'PARENT_ROUTE_CHANGE',
          path: currentPath,
        },
        targetOrigin,
      );
    }
  }, [location.pathname, location.search, visible, scope, targetOrigin]);

  // 监听来自子系统的 postMessage 路由通知，同步修改父级浏览器的地址栏
  useEffect(() => {
    if (!visible) return;

    const handleMessage = (event: MessageEvent) => {
      // 验证消息来源 Origin 是否是当前加载的子应用，拒绝来自非法域的恶意 postMessage 伪造
      if (event.origin !== targetOrigin) {
        return;
      }
      
      if (event.data?.type === 'CHILD_ROUTE_CHANGE') {
        const childPath = event.data.path;
        
        // 校验收到的子应用路由确实属于当前 scope
        const isCurrentScopeRoute = (scope === 'enterprise' && childPath.startsWith('/biz/')) ||
                                    (scope === 'personal' && childPath.startsWith('/personal/'));
        if (!isCurrentScopeRoute) return;

        const currentHostPath = location.pathname + location.search;
        
        if (childPath && childPath !== currentHostPath) {
          lastSentPathRef.current = childPath;
          window.history.replaceState(null, '', `/#${childPath}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [visible, location.pathname, location.search, scope, targetOrigin]);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        position: 'relative',
        display: visible ? 'block' : 'none'
      }}
    >
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
          title={`${scope}-sub-app`}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )}
    </div>
  );
};
