/**
 * API Client for communicating with the Node.js/Express backend
 */

import { getApiBaseUrl } from "@/lib/api";

const API_URL = getApiBaseUrl();

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private getHeaders(includeAuth = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse(response: Response) {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error: ApiError = {
        message: data?.message || `HTTP ${response.status}`,
        code: data?.code,
        statusCode: response.status,
      };

      // Handle 401 - token expired or invalid
      if (response.status === 401) {
        this.clearToken();
      }

      throw error;
    }

    return data;
  }

  async signUp(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const data = await this.handleResponse(response);
    if (data?.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, password }),
    });

    const data = await this.handleResponse(response);
    if (data?.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async signOut(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/signout`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
    } finally {
      this.clearToken();
    }
  }

  async getSession(): Promise<AuthResponse['user'] | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (response.status === 401) {
        this.clearToken();
        return null;
      }

      const data = await this.handleResponse(response);
      return data?.user || null;
    } catch {
      return null;
    }
  }

  async resetPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email }),
    });

    return this.handleResponse(response);
  }

  async confirmResetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/confirm-reset-password`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ token, password }),
    });

    return this.handleResponse(response);
  }

  async get<T = unknown>(endpoint: string, includeAuth = true): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(includeAuth),
    });

    return this.handleResponse(response);
  }

  async post<T = unknown>(endpoint: string, body?: unknown, includeAuth = true): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse(response);
  }

  async put<T = unknown>(endpoint: string, body?: unknown, includeAuth = true): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse(response);
  }

  // ─── Email helpers ────────────────────────────────────────────────────────────
  // These call the Next.js /api/email/* routes, which send via Resend.

  async sendWelcomeEmail(to: string, firstName?: string): Promise<{ id: string }> {
    const response = await fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, firstName: firstName ?? undefined }),
    });
    return this.handleResponse(response);
  }

  async sendVerifyEmail(to: string, firstName?: string, userId?: string): Promise<{ id: string }> {
    const response = await fetch('/api/email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, firstName: firstName ?? undefined, userId: userId ?? undefined }),
    });
    return this.handleResponse(response);
  }

  async sendResetPasswordEmail(to: string, firstName?: string, token?: string): Promise<{ id: string }> {
    const response = await fetch('/api/email/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, firstName: firstName ?? undefined, token: token ?? undefined }),
    });
    return this.handleResponse(response);
  }

  async sendNotificationEmail(
    to: string,
    payload: { subject: string; heading: string; body: string; cta?: { label: string; href: string } },
  ): Promise<{ id: string }> {
    const response = await fetch('/api/email/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, ...payload }),
    });
    return this.handleResponse(response);
  }

  async delete<T = unknown>(endpoint: string, includeAuth = true): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth),
    });

    return this.handleResponse(response);
  }
}

export const apiClient = new ApiClient();
