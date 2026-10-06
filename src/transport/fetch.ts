import {
  AuthenticationError,
  BlocklogTransportError,
  TransportError,
  mapHttpError,
} from '../errors';

export interface RequestOptions {
  json?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  tokenOverride?: string;
}

export type RequestInterceptor = (
  request: {
    method: string;
    path: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  }
) => void | Promise<void>;

export type ResponseInterceptor = (
  response: {
    method: string;
    path: string;
    status: number;
    ok: boolean;
  }
) => void | Promise<void>;

export class SyncTransport {
  private baseUrl: string;
  private credential?: string;
  private timeoutMs: number;
  private debug: boolean;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(options: {
    baseUrl: string;
    apiKey?: string;
    accessToken?: string;
    timeout?: number;
    debug?: boolean;
  }) {
    let base = (options.baseUrl || 'https://blocklogsecurity.com/api/v1').trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(base)) {
      base = `http://${base}`;
    }
    this.baseUrl = base;
    this.credential = options.accessToken ?? options.apiKey;
    this.timeoutMs = options.timeout || 10000;
    this.debug = options.debug ?? false;
  }

  public setCredential(token: string | undefined) {
    this.credential = token;
  }

  public addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  public addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  public async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (this.baseUrl.endsWith('/api/v1') && cleanPath.startsWith('/api/v1/')) {
      cleanPath = cleanPath.slice(7);
    } else if (this.baseUrl.endsWith('/api/v1') && cleanPath === '/api/v1') {
      cleanPath = '';
    } else if (!this.baseUrl.endsWith('/api/v1') && !cleanPath.startsWith('/api/v1/') && cleanPath !== '/api/v1') {
      cleanPath = `/api/v1${cleanPath}`;
    }
    const url = new URL(this.baseUrl + cleanPath);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }


    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'blocklog-typescript/1.0.0',
      ...(options?.headers ?? {}),
    };
    const token = options?.tokenOverride ?? this.credential;
    if (!options?.skipAuth) {
      if (!token) {
        throw new AuthenticationError('Missing apiKey/accessToken for authenticated request');
      }
      headers.Authorization = `Bearer ${token}`;
    }
    const body = options?.json ? JSON.stringify(options.json) : undefined;

    for (const interceptor of this.requestInterceptors) {
      await interceptor({ method, path, url: url.toString(), headers, body });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (this.debug) {
        console.debug(`[blocklog] ${method} ${url.toString()}`);
      }
      const response = await fetch(url.toString(), {
        method,
        headers,
        body,
        signal: controller.signal as any,
      });

      for (const interceptor of this.responseInterceptors) {
        await interceptor({ method, path, status: response.status, ok: response.ok });
      }

      if (!response.ok) {
        const text = await response.text();
        const message = text || `HTTP Error ${response.status}`;
        throw mapHttpError(response.status, message, text);
      }

      if (response.status === 204) {
        return null as T;
      }

      return await response.json() as T;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new TransportError(`Request timed out after ${this.timeoutMs}ms`);
      }
      if (error instanceof Error && !(error instanceof BlocklogTransportError)) {
        throw error;
      }
      throw new TransportError(error?.message || 'Unknown transport error');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
