/**
 * Centralized API Configuration
 * 
 * This is the SINGLE SOURCE OF TRUTH for API base URL in the frontend.
 * All services must import from this file.
 * 
 * Configuration Flow:
 * 1. Backend: API_BASE_URL set in backend/.env
 * 2. Docker: Passes API_BASE_URL to frontend build via VITE_API_BASE_URL
 * 3. Frontend: This file reads VITE_API_BASE_URL at build time
 * 
 * To change the API URL:
 * - Edit backend/.env: API_BASE_URL=https://your-domain.com
 * - Rebuild Docker: docker compose build
 */

export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://chatbot.vela.com.vn',
} as const;

/**
 * Get API base URL
 * @returns The configured API base URL
 */
export function getApiBaseUrl(): string {
    return API_CONFIG.BASE_URL;
}

export default API_CONFIG;
