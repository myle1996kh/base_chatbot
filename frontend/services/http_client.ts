// --- PHẦN KHAI BÁO BIẾN TOÀN CỤC (Đặt ngoài các function) ---

import { getJWTToken, logout, refreshAccessToken } from "./authService";

// Cờ để kiểm tra xem có đang trong quá trình refresh token hay không
let isRefreshing = false;
// Promise lưu trạng thái refresh để các request khác cùng chờ
let refreshTokenPromise: Promise<string | null> | null = null;

/**
 * authFetch: Hàm thay thế cho fetch thông thường
 * Tự động gắn token và xử lý refresh token khi gặp lỗi 401
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // 1. Lấy token hiện tại
  let token = getJWTToken();
  
  // 2. Chuẩn bị headers
  const headers = new Headers(init?.headers || {});
  
  // Chỉ gắn Authorization nếu chưa có (để tránh ghi đè nếu dev muốn custom)
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...init,
    headers,
  };

  // 3. Gọi API lần đầu
  let response = await fetch(input, config);

  // 4. Nếu gặp lỗi 401 -> Xử lý Refresh Token
  if (response.status === 401) {
    // Nếu request này chính là request đi refresh token mà bị 401 thì logout luôn (tránh lặp vô hạn)
    if (input.toString().includes('/api/auth/refresh')) {
      logout();
      return response;
    }

    // Logic xử lý concurrency: Nếu có nhiều request cùng bị 401, chỉ 1 cái đi refresh, các cái khác chờ
    if (!isRefreshing) {
      isRefreshing = true;
      refreshTokenPromise = refreshAccessToken()
        .then((newToken) => {
          isRefreshing = false;
          return newToken;
        })
        .catch(() => {
          isRefreshing = false;
          return null;
        });
    }

    // Chờ kết quả refresh token (dù là request đầu tiên hay các request đến sau)
    const newToken = await refreshTokenPromise;

    if (newToken) {
      // 5. Nếu refresh thành công -> Gọi lại request cũ với token mới
      headers.set('Authorization', `Bearer ${newToken}`);
      
      // Update lại config với header mới
      const newConfig = {
        ...config,
        headers,
      };
      
      // Retry request
      return fetch(input, newConfig);
    } else {
      // Refresh thất bại -> Logout
      logout();
      // Có thể throw lỗi hoặc trả về response 401 cũ để UI xử lý redirect
      return response;
    }
  }

  return response;
}