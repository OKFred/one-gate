import { useState, useEffect, useRef } from 'react';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import * as VoiceAPI from '@/api/admin/voice';

/**
 * 活跃通话会话的状态接口
 */
export interface ActiveSession {
  meetingId: string;
  taskId: string;
}

/**
 * useVoiceSession 返回值接口
 */
export interface UseVoiceSessionReturn {
  /** RealtimeKit Meeting 实例（通话进行中时非 null） */
  meeting: ReturnType<typeof useRealtimeKitClient>[0];
  /** 是否正在发起/加入中 */
  joining: boolean;
  /** 当前活跃会话信息 */
  activeSession: ActiveSession | null;
  /** 发起新通话 */
  startCall: (opts?: { title?: string }) => Promise<void>;
  /** 加入已有通话 */
  joinCall: (meetingId: string) => Promise<void>;
  /** 结束/离开通话 */
  endCall: () => Promise<void>;
}

/**
 * 封装 Cloudflare RealtimeKit 通话会话生命周期
 *
 * 用法:
 * - startCall: 创建新会话 → 获取 authToken → 初始化 SDK
 * - joinCall: 直接加入已有会话 → 获取 authToken → 初始化 SDK
 * - endCall: 离开会话 → 更新后端状态
 * - 组件卸载时自动调用 leaveRoom 避免资源泄漏
 */
export function useVoiceSession(): UseVoiceSessionReturn {
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [joining, setJoining] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const meetingRef = useRef(meeting);

  // 保持 ref 与 state 同步
  useEffect(() => {
    meetingRef.current = meeting;
  }, [meeting]);

  /** 发起新通话会话 */
  async function startCall(opts?: { title?: string }) {
    setJoining(true);
    try {
      const createRes = await VoiceAPI.createMeetingFn({ data: { title: opts?.title } });
      const { meetingId, taskId } = createRes.data.data;

      const joinRes = await VoiceAPI.joinMeetingFn({ data: { meetingId } });
      const { authToken } = joinRes.data.data;

      await initMeeting({ authToken });
      setActiveSession({ meetingId, taskId });
    } catch {
    } finally {
      setJoining(false);
    }
  }

  /** 加入已有通话会话 */
  async function joinCall(meetingId: string) {
    setJoining(true);
    try {
      const joinRes = await VoiceAPI.joinMeetingFn({ data: { meetingId } });
      const { authToken } = joinRes.data.data;

      await initMeeting({ authToken });
      setActiveSession({ meetingId, taskId: '' });
    } catch {
    } finally {
      setJoining(false);
    }
  }

  /** 结束/离开通话会话 */
  async function endCall() {
    const meetingId = activeSession?.meetingId;

    try {
      meetingRef.current?.leave();
    } catch {}

    if (meetingId) {
      try {
        await VoiceAPI.endMeetingFn({ data: { meetingId } });
      } catch {}
    }

    setActiveSession(null);
  }

  // 组件卸载时自动离开，防止资源泄漏
  useEffect(() => {
    return () => {
      try {
        meetingRef.current?.leave();
      } catch {}
    };
  }, []);

  return { meeting, joining, activeSession, startCall, joinCall, endCall };
}
