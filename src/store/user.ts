import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 导出模型类型，供其他组件使用
export type ModelType = 'QWEN' | 'DEEPSEEK'

// 定义用户设置接口
export interface UserSettings {
    selectedModel: ModelType
    enableDeepThinking: boolean
    enableWebSearch: boolean
    // 以后可以在这里添加更多用户设置

    // 操作方法
    setModel: (model: ModelType) => void
    setDeepThinking: (enable: boolean) => void
    setWebSearch: (enable: boolean) => void
}

// 持久化存储的键名
const STORAGE_KEY = 'user-settings'

// 创建用户设置存储
export const useUserStore = create<UserSettings>()(
    persist(
        (set) => ({
            // 默认设置
            selectedModel: 'QWEN',
            enableDeepThinking: false,
            enableWebSearch: false,

            // 设置方法
            setModel: (model) => set({ selectedModel: model }),
            setDeepThinking: (enable) => set({ enableDeepThinking: enable }),
            setWebSearch: (enable) => set({ enableWebSearch: enable }),
        }),
        {
            name: STORAGE_KEY,
            // 确保所有状态都被持久化保存
            partialize: (state) => ({
                selectedModel: state.selectedModel,
                enableDeepThinking: state.enableDeepThinking,
                enableWebSearch: state.enableWebSearch,
            }),
        }
    )
) 