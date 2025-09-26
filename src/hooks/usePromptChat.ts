import { useState, useEffect, useCallback, useRef } from 'react';
import {
    createPromptChat,
    getPromptChat,
    promptChat,
    CreatePromptChatParams,
    PromptChatItem,
    PromptChatParams,
} from '@/services/chat/prompt_chat';
import { WebSearchResponse } from '@/services/chat/chat';

// 确保类型安全的消息接口
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    think_content?: string;
    thinkingTime?: number;
    web_search_data?: WebSearchResponse;
}

interface UsePromptChatReturn {
    // 数据状态
    prompts: PromptChatItem[];
    loading: boolean;
    error: Error | null;

    // 提示词操作
    createChat: (params: CreatePromptChatParams) => Promise<string>;
    fetchPrompts: () => Promise<PromptChatItem[]>;
    getPromptById: (promptId: string) => PromptChatItem | undefined;

    // 消息操作
    sendMessage: (params: PromptChatParams, callbacks: {
        onMessage: (message: string) => void;
        onThinking?: (message: string) => void;
        onWebSearch?: (data: WebSearchResponse) => void;
        onComplete: () => void;
        onError?: (error: Error) => void;
    }) => Promise<void>;

    // 流控制
    abortController: AbortController | null;
    abortStream: () => void;
}

/**
 * 提示词聊天 Hook - 提供提示词和消息发送功能
 */
export function usePromptChat(): UsePromptChatReturn {
    const [prompts, setPrompts] = useState<PromptChatItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // 缓存提示词数据
    const promptsCache = useRef<{
        data: PromptChatItem[];
        timestamp: number;
    }>({ data: [], timestamp: 0 });

    // 缓存过期时间 - 10分钟
    const CACHE_EXPIRY_TIME = 10 * 60 * 1000;

    // 获取提示词聊天列表
    const fetchPrompts = useCallback(async (): Promise<PromptChatItem[]> => {
        const now = Date.now();

        // 如果缓存有效且有数据，直接返回缓存
        if (now - promptsCache.current.timestamp < CACHE_EXPIRY_TIME &&
            promptsCache.current.data.length > 0) {
            setPrompts(promptsCache.current.data);
            return promptsCache.current.data;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await getPromptChat();

            if (response.code === 200) {
                setPrompts(response.prompts_data);

                // 更新缓存
                promptsCache.current = {
                    data: response.prompts_data,
                    timestamp: now
                };

                return response.prompts_data;
            } else {
                const errorMsg = response.message || '获取提示词聊天列表失败';
                throw new Error(errorMsg);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('获取提示词聊天列表失败');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    // 按ID获取提示词
    const getPromptById = useCallback((promptId: string): PromptChatItem | undefined => {
        return prompts.find(p => p.prompt_id === promptId);
    }, [prompts]);

    // 创建提示词聊天
    const createChat = useCallback(async (params: CreatePromptChatParams): Promise<string> => {
        setLoading(true);
        setError(null);

        try {
            // 过滤掉未设置的参数
            const filteredParams: Record<string, any> = {};

            // 必传参数
            filteredParams.session_id = params.session_id;
            filteredParams.title = params.title;
            filteredParams.description = params.description;

            // 可选参数，只有当它们有值时才添加
            if (params.system_prompt) filteredParams.system_prompt = params.system_prompt;
            if (params.user_prompt) filteredParams.user_prompt = params.user_prompt;
            if (params.deep_thinking_tool !== undefined) filteredParams.deep_thinking_tool = params.deep_thinking_tool;
            if (params.web_search_tool !== undefined) filteredParams.web_search_tool = params.web_search_tool;
            if (params.max_history_length !== undefined && params.max_history_length !== null) {
                filteredParams.max_history_length = params.max_history_length;
            }
            if (params.max_tokens !== undefined && params.max_tokens !== null) {
                filteredParams.max_tokens = params.max_tokens;
            }
            if (params.temperature !== undefined && params.temperature !== null) {
                filteredParams.temperature = params.temperature;
            }
            if (params.response_format !== undefined && params.response_format !== null) {
                filteredParams.response_format = params.response_format;
            }

            const response = await createPromptChat(filteredParams as CreatePromptChatParams);

            if (response.code === 200) {
                // 创建成功后刷新列表
                await fetchPrompts();
                return response.prompt_id;
            } else {
                const errorMsg = response.message || '创建提示词聊天失败';
                throw new Error(errorMsg);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('创建提示词聊天失败');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [fetchPrompts]);

    // 中止流
    const abortStream = useCallback(() => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
        }
    }, [abortController]);

    // 发送消息
    const sendMessage = useCallback(async (
        params: PromptChatParams,
        callbacks: {
            onMessage: (message: string) => void;
            onThinking?: (message: string) => void;
            onWebSearch?: (data: WebSearchResponse) => void;
            onComplete: () => void;
            onError?: (error: Error) => void;
        }
    ): Promise<void> => {
        // 如果存在先前的请求，先中止它
        abortStream();

        // 创建新的中止控制器
        const newAbortController = new AbortController();
        setAbortController(newAbortController);

        try {
            await promptChat(params, {
                onMessage: callbacks.onMessage,
                onThinking: callbacks.onThinking,
                onWebSearch: callbacks.onWebSearch,
                onError: (error) => {
                    setError(error);
                    if (callbacks.onError) {
                        callbacks.onError(error);
                    }
                },
                onComplete: () => {
                    setAbortController(null);
                    callbacks.onComplete();
                },
                signal: newAbortController.signal
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('发送消息失败');
            setError(error);
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        }
    }, [abortStream]);

    // 初始化时加载提示词列表
    useEffect(() => {
        fetchPrompts().catch(err => {
            console.error("初始化加载提示词失败:", err);
        });
    }, [fetchPrompts]);

    return {
        prompts,
        loading,
        error,
        createChat,
        fetchPrompts,
        getPromptById,
        sendMessage,
        abortController,
        abortStream
    };
} 