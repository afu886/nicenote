/**
 * request.ts — HTTP 请求封装
 *
 * 基于原生 fetch（Web 和 RN 都支持）
 * 不引入 axios，避免额外依赖
 *
 * 功能:
 *   - baseURL 配置
 *   - 请求 / 响应 拦截器（类似 axios interceptors）
 *   - 自动注入 Authorization token
 *   - 统一错误处理和响应格式
 *   - 简单的重试机制
 */

// ============================================================
// 类型定义
// ============================================================

export interface RequestConfig {
  /** 完整 URL 或相对路径（会拼接 baseURL） */
  url: string
  /** HTTP 方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** 请求头 */
  headers?: Record<string, string>
  /** 请求体（自动序列化为 JSON） */
  data?: unknown
  /** URL 查询参数 */
  params?: Record<string, string | number | boolean>
  /** 超时时间（毫秒） */
  timeout?: number
  /** 重试次数 */
  retries?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
  /** 信号，用于取消请求 */
  signal?: AbortSignal
}

export interface ApiResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Headers
}

export class ApiError extends Error {
  status: number
  statusText: string
  data: unknown

  constructor(message: string, status: number, statusText: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

// ============================================================
// 拦截器类型
// ============================================================

type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
type ResponseInterceptor = (response: ApiResponse) => ApiResponse | Promise<ApiResponse>
type ErrorInterceptor = (error: ApiError) => never | Promise<never>

// ============================================================
// 核心类
// ============================================================

interface CreateRequestOptions {
  /** 基础 URL */
  baseURL?: string
  /** 默认超时，毫秒 */
  timeout?: number
  /** 默认重试次数 */
  retries?: number
  /** 默认请求头 */
  headers?: Record<string, string>
}

export class Request {
  private baseURL: string
  private defaultTimeout: number
  private defaultRetries: number
  private defaultHeaders: Record<string, string>

  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  /** token 获取函数，由外层注册 */
  private getToken: (() => string | Promise<string | null>) | null = null

  constructor(options: CreateRequestOptions = {}) {
    this.baseURL = options.baseURL ?? ''
    this.defaultTimeout = options.timeout ?? 30000
    this.defaultRetries = options.retries ?? 0
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    }
  }

  // --- 拦截器注册 ---

  /** 注册请求拦截器 */
  onRequest(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  /** 注册响应拦截器 */
  onResponse(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  /** 注册错误拦截器 */
  onError(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor)
  }

  /**
   * 注册 token 获取函数
   * 每次请求会自动调用此函数获取最新 token 注入 Authorization 头
   *
   * @example
   *   request.setTokenGetter(async () => {
   *     const token = await storage.get<string>('auth:token');
   *     return token;
   *   });
   */
  setTokenGetter(getter: () => string | Promise<string | null>): void {
    this.getToken = getter
  }

  // --- 快捷方法 ---

  async get<T>(
    url: string,
    config: Omit<RequestConfig, 'url' | 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' })
  }

  async post<T>(
    url: string,
    data?: unknown,
    config: Omit<RequestConfig, 'url' | 'method' | 'data'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data })
  }

  async put<T>(
    url: string,
    data?: unknown,
    config: Omit<RequestConfig, 'url' | 'method' | 'data'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data })
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config: Omit<RequestConfig, 'url' | 'method' | 'data'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', data })
  }

  async delete<T>(
    url: string,
    config: Omit<RequestConfig, 'url' | 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' })
  }

  // --- 核心请求逻辑 ---

  async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    // 1. 执行请求拦截器
    let processedConfig = config
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig)
    }

    // 2. 构建完整 URL
    const url = this.buildUrl(processedConfig.url, processedConfig.params)

    // 3. 构建 headers（注入 token）
    const headers = await this.buildHeaders(processedConfig.headers)

    // 4. 执行请求（带重试）
    const retries = processedConfig.retries ?? this.defaultRetries
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method: processedConfig.method ?? 'GET',
          headers,
          body: processedConfig.data ? JSON.stringify(processedConfig.data) : undefined,
          signal: processedConfig.signal,
          timeout: processedConfig.timeout ?? this.defaultTimeout,
        })

        // 5. 解析响应
        const apiResponse = await this.parseResponse<T>(response)

        // 6. 执行响应拦截器
        let result = apiResponse
        for (const interceptor of this.responseInterceptors) {
          result = (await interceptor(result)) as ApiResponse<T>
        }

        return result
      } catch (error) {
        lastError = error as Error

        // 只有网络错误和 5xx 才重试
        const shouldRetry =
          attempt < retries &&
          (error instanceof TypeError || // 网络错误
            (error instanceof ApiError && error.status >= 500))

        if (!shouldRetry) break

        // 重试延迟（指数退避）
        const delay = (processedConfig.retryDelay ?? 1000) * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    // 7. 执行错误拦截器
    const apiError =
      lastError instanceof ApiError
        ? lastError
        : new ApiError(lastError?.message ?? 'Unknown error', 0, 'Network Error')

    for (const interceptor of this.errorInterceptors) {
      await interceptor(apiError) // interceptor 应该 throw
    }

    throw apiError
  }

  // --- 私有辅助方法 ---

  private buildUrl(url: string, params?: Record<string, string | number | boolean>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`

    if (!params || Object.keys(params).length === 0) return fullUrl

    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      query.append(key, String(value))
    }

    return `${fullUrl}?${query.toString()}`
  }

  private async buildHeaders(
    customHeaders?: Record<string, string>
  ): Promise<Record<string, string>> {
    const headers = { ...this.defaultHeaders, ...customHeaders }

    // 注入 token
    if (this.getToken) {
      const token = await this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  private async fetchWithTimeout(
    url: string,
    options: {
      method: string
      headers: Record<string, string>
      body?: string
      signal?: AbortSignal
      timeout: number
    }
  ): Promise<Response> {
    const { timeout, signal: externalSignal, ...fetchOptions } = options

    // 用 AbortController 实现超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // 如果外部传了 signal，监听它的取消
    const onExternalAbort = () => controller.abort()
    externalSignal?.addEventListener('abort', onExternalAbort)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', onExternalAbort)
    }
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data: T

    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      data = await response.json()
    } else if (contentType.includes('text/')) {
      data = (await response.text()) as unknown as T
    } else {
      data = (await response.blob()) as unknown as T
    }

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}`, response.status, response.statusText, data)
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }
  }
}

// ============================================================
// 全局实例
// ============================================================

/**
 * 全局 request 实例
 * 在 app 入口处配置 baseURL 和 token getter
 *
 * @example
 *   import { request } from '@monorepo/shared';
 *
 *   // apps/web/src/main.ts
 *   request.setTokenGetter(async () => {
 *     return await storage.get<string>('auth:token');
 *   });
 *
 *   // 使用
 *   const { data } = await request.get<User[]>('/api/users');
 *   await request.post('/api/users', { name: 'tom' });
 */
export const request = new Request()
