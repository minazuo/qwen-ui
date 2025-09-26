import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    PromptChatItem,
    CreatePromptChatParams,
    createPromptChat,
    getPromptChat
} from '@/services/chat/prompt_chat';

interface PromptChatState {
    // 提示词数据和缓存相关
    promptsData: PromptChatItem[];
    lastFetchTime: number;
    isLoading: boolean;
    error: string | null;

    // 创建和选择相关
    selectedPromptId: string | null;
    showCreateForm: boolean;

    // 查询和缓存方法
    fetchPromptChats: () => Promise<PromptChatItem[]>;
    getPromptById: (promptId: string) => PromptChatItem | undefined;
    clearCache: () => void;
    forceRefresh: () => Promise<PromptChatItem[]>;

    // 创建和选择方法
    selectPrompt: (id: string) => void;
    createPrompt: (params: CreatePromptChatParams) => Promise<string>;
    setShowCreateForm: (show: boolean) => void;
    clearError: () => void;
}

// 缓存失效时间 - 10分钟
const CACHE_EXPIRY_TIME = 10 * 60 * 1000;

export const usePromptChatStore = create<PromptChatState>()(
    persist(
        (set, get) => ({
            // 初始状态
            promptsData: [],
            lastFetchTime: 0,
            isLoading: false,
            error: null,
            selectedPromptId: null,
            showCreateForm: false,

            // 获取提示词列表（带缓存）
            fetchPromptChats: async () => {
                const { lastFetchTime, promptsData } = get();
                const now = Date.now();

                // 如果缓存有效且有数据，直接返回缓存数据
                if (now - lastFetchTime < CACHE_EXPIRY_TIME && promptsData.length > 0) {
                    return promptsData;
                }

                try {
                    set({ isLoading: true, error: null });
                    const response = await getPromptChat();

                    if (response.code === 200) {
                        set({
                            promptsData: response.prompts_data,
                            lastFetchTime: now,
                            isLoading: false
                        });
                        return response.prompts_data;
                    } else {
                        throw new Error(response.message || '获取提示词聊天列表失败');
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    set({ error: errorMessage, isLoading: false });
                    return [];
                }
            },

            // 强制刷新数据，忽略缓存
            forceRefresh: async () => {
                try {
                    set({ isLoading: true, error: null });
                    const response = await getPromptChat();

                    if (response.code === 200) {
                        set({
                            promptsData: response.prompts_data,
                            lastFetchTime: Date.now(),
                            isLoading: false
                        });
                        return response.prompts_data;
                    } else {
                        throw new Error(response.message || '获取提示词聊天列表失败');
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    set({ error: errorMessage, isLoading: false });
                    return [];
                }
            },

            // 根据ID获取提示词
            getPromptById: (promptId) => {
                const prompt = get().promptsData.find(p => p.prompt_id === promptId);
                if (!prompt) return undefined;

                // 确保title是字符串类型
                return {
                    ...prompt,
                    title: typeof prompt.title === 'string' ? prompt.title :
                        prompt.title ? String(prompt.title) : '未命名提示词',
                    // 确保深度思考和网络搜索属性存在
                    deep_thinking_tool: !!prompt.deep_thinking_tool,
                    web_search_tool: !!prompt.web_search_tool
                };
            },

            // 清除缓存
            clearCache: () => {
                set({ lastFetchTime: 0 });
            },

            // 选择提示词
            selectPrompt: (id: string) => {
                set({ selectedPromptId: id });
            },

            // 创建提示词
            createPrompt: async (params: CreatePromptChatParams) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await createPromptChat(params);
                    if (response.code === 200) {
                        // 创建成功后强制刷新列表并选中新创建的提示词
                        await get().forceRefresh();
                        set({ selectedPromptId: response.prompt_id, showCreateForm: false });
                        return response.prompt_id;
                    } else {
                        set({ error: response.message || '创建提示词失败' });
                        throw new Error(response.message || '创建提示词失败');
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '创建提示词失败';
                    set({ error: errorMessage });
                    throw new Error(errorMessage);
                } finally {
                    set({ isLoading: false });
                }
            },

            // 设置是否显示创建表单
            setShowCreateForm: (show: boolean) => {
                set({ showCreateForm: show });
            },

            // 清除错误
            clearError: () => {
                set({ error: null });
            }
        }),
        {
            name: 'prompt-chat-storage',
            partialize: (state) => ({
                promptsData: state.promptsData,
                lastFetchTime: state.lastFetchTime,
                selectedPromptId: state.selectedPromptId
            }),
        }
    )
); 