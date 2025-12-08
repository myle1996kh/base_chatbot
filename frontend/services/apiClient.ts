/**
 * API Client with automatic token refresh
 * 
 * Wraps fetch API to automatically handle 401 errors by refreshing token
 * and retrying the original request.
 */

import { refreshAccessToken, getJWTToken } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetch with automatic authentication and token refresh
 * 
 * Usage:
 *   const response = await fetchWithAuth('/api/sessions', { method: 'GET' });
 * 
 * @param url - API endpoint (relative or absolute)
 * @param options - Fetch options
 * @returns Response object
 */
export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Make URL absolute if relative
    const absoluteUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // Get current token
    const token = getJWTToken();

    // Add Authorization header
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // First attempt
    let response = await fetch(absoluteUrl, {
        ...options,
        headers,
    });

    // If 401, try to refresh token and retry
    if (response.status === 401) {
        console.log('Received 401, attempting to refresh token...');

        const newToken = await refreshAccessToken();

        if (newToken) {
            console.log('Token refreshed, retrying request...');

            // Retry with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(absoluteUrl, {
                ...options,
                headers,
            });

            if (response.ok) {
                console.log('Request succeeded after token refresh');
            }
        } else {
            console.error('Token refresh failed, redirecting to login...');
            // Redirect to login page
            window.location.href = '/login';
        }
    }

    return response;
}

/**
 * GET request with auth
 */
export async function get(url: string): Promise<Response> {
    return fetchWithAuth(url, { method: 'GET' });
}

/**
 * POST request with auth
 */
export async function post(url: string, data: any): Promise<Response> {
    return fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * PUT request with auth
 */
export async function put(url: string, data: any): Promise<Response> {
    return fetchWithAuth(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * DELETE request with auth
 */
export async function del(url: string): Promise<Response> {
    return fetchWithAuth(url, { method: 'DELETE' });
}

export default {
    fetchWithAuth,
    get,
    post,
    put,
    del,
};
