import axios from 'axios';

// 创建用户模块的axios实例
const userApiClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加token
userApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器
userApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，清除本地存储并跳转到登录页
      localStorage.removeItem('userToken');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// 用户API接口类型定义
export interface User {
  id: number;
  username: string;
  department: string;
  role: string;
  isEnabled: boolean;
  createTimeUtc?: number;
  updateTimeUtc?: number;
}

export interface UserAddRequest {
  username: string;
  password: string;
  department: string;
  role: string;
  isEnabled: boolean;
}

export interface UserUpdateRequest {
  id: number;
  username?: string;
  password?: string;
  department?: string;
  role?: string;
  isEnabled?: boolean;
}

export interface UserGetRequest {
  id?: number;
  username?: string;
}

export interface UserListRequest {
  orderBy?: string;
  descend?: boolean;
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
}

export interface UserDeleteRequest {
  id?: number;
  username?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

export interface UserListResponse {
  list: User[];
  total: number;
  pageNo: number;
  pageSize: number;
}

// 用户API服务类
export class UserApiService {
  // 添加用户
  static async addUser(userData: UserAddRequest): Promise<ApiResponse<number>> {
    try {
      const response = await userApiClient.post('/api/user/add', userData);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || '添加用户失败');
    }
  }

  // 获取用户详情
  static async getUser(params: UserGetRequest): Promise<ApiResponse<User>> {
    try {
      const response = await userApiClient.post('/api/user/get', params);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || '获取用户详情失败');
    }
  }

  // 获取用户列表
  static async getUserList(params: UserListRequest = {}): Promise<ApiResponse<UserListResponse>> {
    try {
      const response = await userApiClient.post('/api/user/list', {
        orderBy: 'id',
        descend: true,
        pageNo: 1,
        pageSize: 10,
        ...params,
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || '获取用户列表失败');
    }
  }

  // 更新用户
  static async updateUser(userData: UserUpdateRequest): Promise<ApiResponse<number>> {
    try {
      const response = await userApiClient.post('/api/user/update', userData);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || '更新用户失败');
    }
  }

  // 删除用户
  static async deleteUser(params: UserDeleteRequest): Promise<ApiResponse<number>> {
    try {
      const response = await userApiClient.post('/api/user/delete', params);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(err.response?.data?.message || err.message || '删除用户失败');
    }
  }

  // 获取当前用户信息
  static getCurrentUser(): User | null {
    try {
      const userInfo = localStorage.getItem('userInfo');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch {
      return null;
    }
  }

  // 更新当前用户信息到本地存储
  static updateCurrentUser(user: User): void {
    localStorage.setItem('userInfo', JSON.stringify(user));
  }
}

export default UserApiService;
