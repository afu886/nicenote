/**
 * Note 实体类型
 * 前后端共享的笔记数据结构
 */
export interface Note {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 创建笔记的请求参数
 */
export interface CreateNoteRequest {
  title?: string
  content?: string
}

/**
 * 更新笔记的请求参数
 */
export interface UpdateNoteRequest {
  title?: string
  content?: string
}

/**
 * API 响应包装类型
 */
export interface ApiResponse<T> {
  data?: T
  error?: string
}
