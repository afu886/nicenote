/**
 * storage.ts — 统一存储封装
 *
 * Web 用 localStorage，React Native 用 AsyncStorage
 * 通过 adapter 模式屏蔽平台差异，对上层接口一致
 *
 * 使用方式:
 *   1. 在 app 入口处注册 adapter
 *   2. 之后全局使用 storage.get / storage.set
 *
 * 功能:
 *   - 自动 JSON 序列化 / 反序列化
 *   - 支持过期时间（TTL）
 *   - 类型安全的 get
 */

// ============================================================
// Adapter 接口定义
// ============================================================

/** 底层存储适配器接口，Web 和 RN 各自实现 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
  getAllKeys(): Promise<string[]>
}

// ============================================================
// Web Adapter — localStorage 封装为异步接口
// ============================================================

export class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    localStorage.clear()
  }

  async getAllKeys(): Promise<string[]> {
    return Object.keys(localStorage)
  }
}

// ============================================================
// RN Adapter — 在 apps/rn 入口处实际注册
// 这里只定义创建函数，避免直接引入 AsyncStorage 包
// ============================================================

/**
 * 创建 RN 的 AsyncStorage Adapter
 * 在 apps/rn 入口处调用：
 *
 *   import AsyncStorage from '@react-native-async-storage/async-storage';
 *   import { createAsyncStorageAdapter, storage } from '@monorepo/shared';
 *
 *   storage.setAdapter(createAsyncStorageAdapter(AsyncStorage));
 */
export function createAsyncStorageAdapter(asyncStorage: {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
  getAllKeys(): Promise<string[]>
}): StorageAdapter {
  return {
    getItem: (key) => asyncStorage.getItem(key),
    setItem: (key, value) => asyncStorage.setItem(key, value),
    removeItem: (key) => asyncStorage.removeItem(key),
    clear: () => asyncStorage.clear(),
    getAllKeys: () => asyncStorage.getAllKeys(),
  }
}

// ============================================================
// 带 TTL 的数据包装
// ============================================================

interface StorageEntry<T> {
  data: T
  expiresAt?: number // 过期时间戳，undefined 表示永不过期
}

// ============================================================
// Storage 核心类
// ============================================================

export class Storage {
  private adapter: StorageAdapter | null = null

  /**
   * 注册底层 adapter
   * 必须在使用任何 get/set 之前调用
   */
  setAdapter(adapter: StorageAdapter): void {
    this.adapter = adapter
  }

  private getAdapter(): StorageAdapter {
    if (!this.adapter) {
      throw new Error(
        'Storage adapter not initialized. ' + '请在 app 入口处调用 storage.setAdapter()'
      )
    }
    return this.adapter
  }

  /**
   * 读取值
   * 自动处理过期检查，过期则删除并返回 null
   *
   * @example
   *   const name = await storage.get<string>('user:name');
   */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.getAdapter().getItem(key)
    if (raw === null) return null

    try {
      const entry = JSON.parse(raw) as StorageEntry<T>

      // 检查过期
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.remove(key)
        return null
      }

      return entry.data
    } catch {
      // 解析失败（可能是旧格式数据），清除并返回 null
      await this.remove(key)
      return null
    }
  }

  /**
   * 写入值
   *
   * @param key   键
   * @param value 值（自动序列化）
   * @param ttl   可选的过期时间（毫秒），不传则永不过期
   *
   * @example
   *   await storage.set('user:name', 'tom');
   *   await storage.set('token', 'xxx', { ttl: 60 * 60 * 1000 }); // 1小时后过期
   */
  async set<T>(key: string, value: T, options: { ttl?: number } = {}): Promise<void> {
    const entry: StorageEntry<T> = {
      data: value,
      ...(options.ttl ? { expiresAt: Date.now() + options.ttl } : {}),
    }
    await this.getAdapter().setItem(key, JSON.stringify(entry))
  }

  /** 删除单个键 */
  async remove(key: string): Promise<void> {
    await this.getAdapter().removeItem(key)
  }

  /** 删除多个键 */
  async removeMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.remove(key)))
  }

  /** 清空所有存储 */
  async clear(): Promise<void> {
    await this.getAdapter().clear()
  }

  /** 获取所有键 */
  async keys(): Promise<string[]> {
    return this.getAdapter().getAllKeys()
  }

  /** 按前缀获取所有键 */
  async keysByPrefix(prefix: string): Promise<string[]> {
    const allKeys = await this.keys()
    return allKeys.filter((key) => key.startsWith(prefix))
  }

  /** 判断键是否存在（且未过期） */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }
}

// ============================================================
// 全局单例
// ============================================================

/**
 * 全局 storage 实例
 * 直接导入使用，无需自己实例化
 *
 * @example
 *   import { storage } from '@monorepo/shared';
 *
 *   // Web 入口 (apps/web/src/main.ts)
 *   import { WebStorageAdapter } from '@monorepo/shared';
 *   storage.setAdapter(new WebStorageAdapter());
 *
 *   // RN 入口 (apps/rn/App.tsx)
 *   import AsyncStorage from '@react-native-async-storage/async-storage';
 *   import { createAsyncStorageAdapter } from '@monorepo/shared';
 *   storage.setAdapter(createAsyncStorageAdapter(AsyncStorage));
 */
export const storage = new Storage()
