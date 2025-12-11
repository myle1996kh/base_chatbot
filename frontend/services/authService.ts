/**
 * Authentication Service
 *
 * Handles communication with the ITL Backend API for user authentication,
 * login, user management, and session management.
 * Supports multiple user roles: tenant_user, supporter, admin
 */

import { API_CONFIG as CENTRALIZED_CONFIG } from '@/src/config/api';
import { authFetch } from './http_client'; // Đảm bảo đường dẫn đúng

// Polyfill cho AbortSignal.timeout nếu trình duyệt chưa hỗ trợ
if (!AbortSignal.timeout) {
  (AbortSignal as any).timeout = function (ms: number) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

/**
 * API Configuration
 */
const API_CONFIG = {
  BASE_URL: CENTRALIZED_CONFIG.BASE_URL,
  LOGIN_ENDPOINT: '/api/auth/login',
  CREATE_USER_ENDPOINT: '/api/auth/users',
  GET_USER_ENDPOINT: '/api/auth/users/{user_id}',
  UPDATE_USER_ENDPOINT: '/api/auth/users/{user_id}',
  DELETE_USER_ENDPOINT: '/api/auth/users/{user_id}',
  CHANGE_PASSWORD_ENDPOINT: '/api/auth/change-password',
  TIMEOUT_MS: 30000,
};

/**
 * Auth Service Interfaces
 */
export interface LoginRequest {
  username: string;
  password: string;
  tenant_id?: string;
}

export interface LoginResponse {
  user_id: string;
  email: string;
  username: string;
  display_name?: string;
  role: string;
  tenant_id: string;
  token: string;
  refresh_token: string;
  status: string;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  display_name?: string;
  role: string;
  status: string;
  tenant_id: string;
  created_at: string;
  last_login?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface AuthServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface UserResponse {
  user_id: string;
  email: string;
  username: string;
  display_name?: string;
  role: string;
  tenant_id: string;
  status: string;
  created_at?: string;
  last_login?: string;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  display_name?: string;
  role?: string;
  status?: string;
  tenant_id?: string;
}

export interface UserListResponse {
  users: UserResponse[];
  total: number;
}

export interface AuthSession {
  user: LoginResponse;
  token: string;
  expiresAt: Date;
}

/**
 * Login user with username and password
 * LƯU Ý: Vẫn dùng fetch thường vì endpoint này public, không cần gửi kèm Token cũ.
 */
export async function login(
  username: string,
  password: string,
  tenantId?: string
): Promise<AuthServiceResponse<LoginResponse>> {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.LOGIN_ENDPOINT}`;

    const payload: LoginRequest = { username, password };
    if (tenantId) {
      payload.tenant_id = tenantId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as any).detail || (errorData as any).message || `HTTP ${response.status}: ${response.statusText}`;

      return {
        success: false,
        error: errorMessage,
        code: `HTTP_${response.status}`,
      };
    }

    const data: LoginResponse = await response.json();

    // Store tokens
    localStorage.setItem('jwtToken', data.token);
    localStorage.setItem('refreshToken', data.refresh_token);
    localStorage.setItem('currentUser', JSON.stringify(data));

    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      code: 'LOGIN_ERROR',
    };
  }
}

/**
 * Create User
 * Sửa đổi: Bỏ tham số adminToken, dùng authFetch
 */
export async function createUser(
  request: CreateUserRequest
): Promise<AuthServiceResponse<UserResponse>> {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.CREATE_USER_ENDPOINT}`;

    const response = await authFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization header được tự động thêm bởi authFetch
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as any).detail || (errorData as any).message || `HTTP ${response.status}: ${response.statusText}`;

      return {
        success: false,
        error: errorMessage,
        code: `HTTP_${response.status}`,
      };
    }

    const data: UserResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: errorMessage,
      code: 'CREATE_USER_ERROR',
    };
  }
}

/**
 * Get Single User
 * Sửa đổi: Bỏ tham số adminToken, dùng authFetch
 */
export async function getUser(
  userId: string
): Promise<AuthServiceResponse<UserResponse>> {
  try {
    const url = `${API_CONFIG.BASE_URL}/api/auth/users/${userId}`;

    const response = await authFetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to get user: HTTP ${response.status}`,
        code: `HTTP_${response.status}`,
      };
    }

    const data: UserResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'GET_USER_ERROR',
    };
  }
}

/**
 * Get All Users
 * Sửa đổi: Bỏ tham số adminToken, dùng authFetch
 */
export async function getUsers(): Promise<AuthServiceResponse<UserListResponse>> {
  try {
    const url = `${API_CONFIG.BASE_URL}/api/auth/users`;

    const response = await authFetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to get users: HTTP ${response.status}`,
        code: `HTTP_${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'GET_USERS_ERROR',
    };
  }
}

/**
 * Update User
 * Sửa đổi: Bỏ tham số adminToken, dùng authFetch
 */
export async function updateUser(
  userId: string,
  request: UpdateUserRequest
): Promise<AuthServiceResponse<UserResponse>> {
  try {
    // Sử dụng template literal cho an toàn thay vì replace trên config
    const url = `${API_CONFIG.BASE_URL}/api/auth/users/${userId}`;

    const response = await authFetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to update user: HTTP ${response.status}`,
        code: `HTTP_${response.status}`,
      };
    }

    const data: UserResponse = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'UPDATE_USER_ERROR',
    };
  }
}

/**
 * Delete User
 * Sửa đổi: Bỏ tham số adminToken, dùng authFetch
 */
export async function deleteUser(
  userId: string
): Promise<AuthServiceResponse> {
  try {
    const url = `${API_CONFIG.BASE_URL}/api/auth/users/${userId}`;

    const response = await authFetch(url, {
      method: 'DELETE',
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to delete user: HTTP ${response.status}`,
        code: `HTTP_${response.status}`,
      };
    }

    return {
      success: true,
      data: { message: 'User deleted successfully' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'DELETE_USER_ERROR',
    };
  }
}

/**
 * Change Password
 * Sửa đổi: Bỏ tham số userToken, dùng authFetch
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<AuthServiceResponse> {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.CHANGE_PASSWORD_ENDPOINT}`;

    const response = await authFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (errorData as any).detail || 'Failed to change password',
        code: `HTTP_${response.status}`,
      };
    }

    return {
      success: true,
      data: { message: 'Password changed successfully' },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'CHANGE_PASSWORD_ERROR',
    };
  }
}


export function getCurrentUser(): LoginResponse | null {
  try {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return null;
    return JSON.parse(userJson) as LoginResponse;
  } catch (error) {
    console.error('Failed to parse current user:', error);
    return null;
  }
}

export function getJWTToken(): string | null {
  return localStorage.getItem('jwtToken');
}

export function isAuthenticated(): boolean {
  return !!getJWTToken() && !!getCurrentUser();
}

export function hasRole(requiredRole: string): boolean {
  const user = getCurrentUser();
  return user?.role === requiredRole;
}

// cập nhật để hỗ trợ Unicode (Tiếng Việt)
function decodeJWT(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export function getUserRole(): string | null {
  const token = getJWTToken();
  if (token) {
    const payload = decodeJWT(token);
    if (payload?.role) {
      return payload.role;
    }
  }

  const user = getCurrentUser();
  return user?.role || null;
}

export function isAdmin(): boolean {
  return getUserRole() === 'admin';
}

export function isSupporter(): boolean {
  return getUserRole() === 'supporter';
}

/**
 * Refresh access token using refresh token
 * LƯU Ý: Hàm này MỚI BẮT BUỘC dùng fetch thường.
 * Không được dùng authFetch ở đây để tránh vòng lặp vô tận.
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.warn('No refresh token found');
      return null;
    }

    const url = `${API_CONFIG.BASE_URL}/api/auth/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', response.status);
      logout();
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;

    localStorage.setItem('jwtToken', newAccessToken);
    console.log('Access token refreshed successfully');

    return newAccessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    logout();
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
  console.log('User logged out');
 
  window.location.href = '/login';
}

export function setApiBaseUrl(baseUrl: string): void {
  API_CONFIG.BASE_URL = baseUrl;
}

export function getApiBaseUrl(): string {
  return API_CONFIG.BASE_URL;
}

export default {
  login,
  createUser,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  changePassword,
  getCurrentUser,
  getJWTToken,
  isAuthenticated,
  hasRole,
  isAdmin,
  isSupporter,
  refreshAccessToken,
  logout,
  setApiBaseUrl,
  getApiBaseUrl,
};