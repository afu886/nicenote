/**
 * @nicenote/shared — 入口
 *
 * 所有工具函数和通用类型的统一出口
 */

// ============================================================
// 工具函数
// ============================================================
export { debounce, throttle } from './debounce'
export { toKebabCase } from './parsers'
export { getLinkValidationError } from './validators'

// ============================================================
// 领域 Schema & 类型
// ============================================================
export type {
  NoteContractService,
  NoteCreateInput,
  NoteInsert,
  NoteSelect,
  NoteUpdateInput,
} from './schemas'
export {
  noteCreateSchema,
  noteIdParamSchema,
  noteInsertSchema,
  noteSelectSchema,
  noteUpdateSchema,
} from './schemas'
