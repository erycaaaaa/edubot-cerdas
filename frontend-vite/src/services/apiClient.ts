import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (configured) {
    try {
      const url = new URL(configured);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return url.origin;
      }
    } catch {
      // Fall through to origin-safe fallback below.
    }
  }

  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return window.location.origin;
  }

  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export async function getAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        '❌ Supabase getSession error:',
        error.message,
      );

      return null;
    }

    if (session?.access_token) {
      console.log('✅ Supabase session found');
      return session.access_token;
    }

    console.warn('⚠️ No active Supabase session.');

    return null;
  } catch (error) {
    console.error(
      '❌ Failed to get Supabase access token:',
      error,
    );

    return null;
  }
}

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        config.headers.Authorization =
          `Bearer ${accessToken}`;

        console.log(
          `🔐 Auth token attached: ${
            config.method?.toUpperCase()
          } ${config.url}`,
        );
      } else {
        console.warn(
          `⚠️ NO AUTH TOKEN: ${
            config.method?.toUpperCase()
          } ${config.url}`,
        );
      }
    } catch (error) {
      console.error(
        '❌ Failed to attach auth token:',
        error,
      );
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error('🔴 401 Unauthorized');
      console.error(
        'Method:',
        error.config?.method?.toUpperCase(),
      );
      console.error(
        'URL:',
        error.config?.url,
      );
      console.error(
        'Backend response:',
        error.response.data,
      );
    }

    return Promise.reject(error);
  },
);

export async function sendChatMessage(
  message: string,
  requestId?: string,
) {
  const response = await apiClient.post(
    '/api/chat',
    {
      message,
      requestId,
    },
    {
      timeout: 190000,
    },
  );

  const data = response.data.data;

  if (data.gamification) {
    data.gamification = normalizeGamification(data.gamification);
  }

  return data;
}

export interface GamificationBadge {
  badge_id: string;
  name: string;
  description: string;
  condition: string;
}

export interface GamificationData {
  xp: number;
  expBalance: number;
  avatar?: string;
  level: {
    level: number;
    name: string;
    current_xp: number;
    next_level_xp: number | null;
    progress_to_next_level: number;
  };
  streakDays: number;
  lastActiveDate: string | null;
  conversationCount: number;
  helpfulFeedbackCount: number;
  challengeCount: number;
  badges: GamificationBadge[];
}

interface GamificationPayload {
  expBalance?: number;
  avatar?: string;
  levelInfo?: GamificationData['level'];
  xp?: number;
  newXp?: number;
  level?: number | GamificationData['level'];
  levelName?: string;
  streakDays?: number;
  lastActiveDate?: string | null;
  conversationCount?: number;
  helpfulFeedbackCount?: number;
  challengeCount?: number;
  badges?: GamificationBadge[];
  progress_to_next_level?: number;
  updatedAt?: string | null;
}

function normalizeGamification(
  value: GamificationPayload,
): GamificationData {
  const xp = Number(value.xp ?? value.newXp ?? 0);
  const levelData = value.levelInfo ?? (
    typeof value.level === 'object'
      ? value.level
      : undefined);
  const level = Number(
    levelData?.level ?? value.level ?? 1,
  );

  return {
    xp,
    expBalance: Number(value.expBalance ?? 0),
    avatar: value.avatar,
    level: {
      level,
      name: levelData?.name ?? value.levelName ?? 'Learning Explorer',
      current_xp: Number(levelData?.current_xp ?? xp),
      next_level_xp: levelData?.next_level_xp ?? null,
      progress_to_next_level: Number(
        levelData?.progress_to_next_level ?? value.progress_to_next_level ?? 0,
      ),
    },
    streakDays: Number(value.streakDays ?? 0),
    lastActiveDate: value.lastActiveDate ?? value.updatedAt ?? null,
    conversationCount: Number(value.conversationCount ?? 0),
    helpfulFeedbackCount: Number(value.helpfulFeedbackCount ?? 0),
    challengeCount: Number(value.challengeCount ?? 0),
    badges: value.badges ?? [],
  };
}

export interface StudentStrikeStatus {
  strikeCount: number;
  isBlocked: boolean;
  violations: Array<{
    id: string;
    message: string;
    detected_words: string[];
    strike_level: number;
    created_at: string;
  }>;
}

export interface ChatHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  request_id?: string | null;
  session_id?: string | null;
  is_violation?: boolean;
  created_at?: string;
}

export async function getMyStrikes(): Promise<StudentStrikeStatus> {
  const response = await apiClient.get('/api/me/strikes');
  return response.data.data;
}

export async function getMyGamification(): Promise<GamificationData> {
  const response = await apiClient.get<{ data: GamificationPayload }>(
    '/api/me/gamification',
  );
  return normalizeGamification(response.data.data);
}

export async function getMyChatHistory(): Promise<ChatHistoryItem[]> {
  const response = await apiClient.get<{ data: ChatHistoryItem[] }>(
    '/api/me/chat-history',
  );
  return response.data.data ?? [];
}

interface HelpfulFeedbackRewardPayload {
  reward_delta?: number;
  rewardDelta?: number;
  new_xp?: number;
  newXp?: number;
  exp_balance?: number;
  expBalance?: number;
  level?: GamificationData['level'];
  levelInfo?: GamificationData['level'];
}

function normalizeHelpfulFeedbackReward(
  payload: HelpfulFeedbackRewardPayload | Record<string, unknown> | null | undefined,
) {
  const normalized = (payload ?? {}) as HelpfulFeedbackRewardPayload & Record<string, unknown>;
  const rewardDelta = Number(
    normalized.reward_delta ?? normalized.rewardDelta ?? 0,
  );
  const newXp = Number(
    normalized.new_xp ?? normalized.newXp ?? 0,
  );
  const expBalance = Number(
    normalized.exp_balance ?? normalized.expBalance ?? 0,
  );
  const level = (normalized.level ?? normalized.levelInfo ?? {
    level: 1,
    name: 'Learning Explorer',
    current_xp: 0,
    next_level_xp: null,
    progress_to_next_level: 0,
  }) as GamificationData['level'];

  return {
    reward_delta: rewardDelta,
    new_xp: newXp,
    exp_balance: expBalance,
    level,
  };
}

export async function submitHelpfulFeedback(requestId: string) {
  const response = await apiClient.post<{ data: HelpfulFeedbackRewardPayload }>('/api/me/gamification/feedback', { feedback: 'helpful', requestId });

  const payload = response.data?.data ?? response.data ?? null;
  const normalizedReward = normalizeHelpfulFeedbackReward(payload);

  console.log('📦 Helpful feedback API payload:', payload);
  console.log('📦 Normalized helpful reward:', normalizedReward);

  return normalizedReward;
}

export interface AvatarCollection {
  xp: number;
  level: number;
  expBalance: number;
  avatar: string;
  equippedAvatarId: string | null;
  avatars: Array<{ id: string; name: string; description: string; emoji: string; cost_exp: number; is_active: boolean; owned: boolean; equipped: boolean }>;
  history: Array<{ id: string; event_type: string; reward_delta: number; xp_after: number; exp_after: number | null; reason: string | null; created_at: string }>;
}

export async function getMyAvatars(): Promise<AvatarCollection> {
  return (await apiClient.get<{ data: AvatarCollection }>('/api/me/avatars')).data.data;
}

export async function updateAvatar(avatarId: string, action: 'unlock' | 'equip'): Promise<void> {
  await apiClient.post(`/api/me/avatars/${encodeURIComponent(avatarId)}/${action}`, {});
}

export interface TeacherStudent {
  id: string;
  name: string;
  email: string;
  role: string;
  school_id: string;
  grade: number | null;
  avatar: string | null;
  strike_count: number;
  is_blocked: boolean;
  updated_at: string;
}

export interface TeacherNotification {
  id: string;
  violation_id?: string;
  school_id: string;
  student_id: string;
  student_name: string;
  student_avatar: string;
  strike_level: 1 | 2 | 3;
  type: string;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
}

export async function getTeacherStudents(): Promise<TeacherStudent[]> {
  const response = await apiClient.get('/api/teacher/students');
  return response.data.data;
}

export async function getTeacherNotifications(): Promise<TeacherNotification[]> {
  const response = await apiClient.get('/api/teacher/notifications');
  return response.data.data;
}

export async function markTeacherNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/api/teacher/notifications/${id}/read`);
}

export async function markAllTeacherNotificationsRead(): Promise<void> {
  await apiClient.patch('/api/teacher/notifications/read-all');
}

export async function resetStudentStrikes(
  studentId: string,
  notes?: string,
): Promise<void> {
  await apiClient.post(
    `/api/teacher/students/${studentId}/reset-strikes`,
    { notes },
  );
}
