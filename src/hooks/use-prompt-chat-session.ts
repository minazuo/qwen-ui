import { useRef, useState, useEffect } from "react";
import { promptChat } from "@/services/chat/prompt_chat";
import { WebSearchResponse } from "@/services/chat/chat";
import { PromptChatSession, PromptChatMessage, usePromptChatSessionStore } from "@/store/prompt-chat-session-store";
import { usePromptChatStore } from "@/store/prompt-chat-store";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    think_content?: string;
    thinkingTime?: number;
    web_search_data?: WebSearchResponse;
}

interface UsePromptChatSessionReturn {
    messages: Message[];
    isLoading: boolean;
    currentPromptId: string | null;
    currentSession: string | null;
    thinkingContent: string;
    showThinking: boolean;
    thinkingTime: number;
    isThinkingExpanded: boolean;
    isThinkingComplete: boolean;
    webSearchData: WebSearchResponse | null;
    handleSend: (message: string, promptId: string, signal?: AbortSignal, enableDeepThinking?: boolean, enableWebSearch?: boolean) => Promise<void>;
    handleToggleThinking: () => void;
    regenerateLastMessage: (promptId: string, mode: 'regenerate' | 'continue', signal?: AbortSignal, enableDeepThinking?: boolean, enableWebSearch?: boolean) => Promise<void>;
    promptConfig: {
        enableDeepThinking: boolean;
        enableWebSearch: boolean;
        hasDeepThinkingTool: boolean;
        hasWebSearchTool: boolean;
    };
    updatePromptConfig: (updates: Partial<{
        enableDeepThinking: boolean;
        enableWebSearch: boolean;
    }>) => void;
}

export function usePromptChatSession(): UsePromptChatSessionReturn {
    const abortControllerRef = useRef<AbortController | null>(null);
    // 使用标志变量控制是否停止渲染
    const shouldStopRenderingRef = useRef<boolean>(false);
    // 存储网络检索数据
    const [webSearchData, setWebSearchData] = useState<WebSearchResponse | null>(null);
    // 存储当前会话的消息
    const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
    // 获取当前提示词的配置
    const getPromptById = usePromptChatStore(state => state.getPromptById);
    const [promptConfig, setPromptConfig] = useState({
        enableDeepThinking: false,
        enableWebSearch: false,
        hasDeepThinkingTool: false,
        hasWebSearchTool: false
    });

    // 从 store 获取状态和方法
    const {
        sessions,
        currentSession,
        currentPromptId,
        thinking,
        isLoading,
        addMessage,
        updateAssistantMessage,
        updateThinking,
        setStreamingSession,
        replaceLastAssistantMessage
    } = usePromptChatSessionStore();

    // 当会话变化时获取消息
    useEffect(() => {
        if (currentSession) {
            const sessionData = sessions.find((s: PromptChatSession) => s.id === currentSession);
            if (sessionData) {
                setSessionMessages(sessionData.messages.map((msg: PromptChatMessage) => ({
                    role: msg.role,
                    content: msg.content,
                    think_content: msg.think_content,
                    thinkingTime: msg.thinkingTime,
                    web_search_data: msg.web_search_data
                })));

                // 重置网络检索数据，避免切换会话时显示上次的搜索结果
                setWebSearchData(null);
            }
        } else {
            setSessionMessages([]);
            // 重置网络检索数据
            setWebSearchData(null);
        }
    }, [currentSession, sessions]);

    // 当currentPromptId变化时获取提示词配置
    useEffect(() => {
        if (currentPromptId) {
            const prompt = getPromptById(currentPromptId);
            if (prompt) {
                // 这里deep_thinking_tool和web_search_tool表示应用是否拥有这些工具能力
                // 而不是默认启用状态，所以我们只需要记录工具可用性
                setPromptConfig({
                    enableDeepThinking: false, // 默认不启用，即使应用有这个能力
                    enableWebSearch: false,    // 默认不启用，即使应用有这个能力
                    hasDeepThinkingTool: !!prompt.deep_thinking_tool, // 应用是否有深度思考能力
                    hasWebSearchTool: !!prompt.web_search_tool         // 应用是否有网络搜索能力
                });
            }
        }
    }, [currentPromptId, getPromptById]);

    // 用于更新功能启用状态的函数
    const updateFeatureState = (feature: 'deepThinking' | 'webSearch', enabled: boolean) => {
        setPromptConfig(prev => {
            if (feature === 'deepThinking') {
                return { ...prev, enableDeepThinking: enabled };
            } else {
                return { ...prev, enableWebSearch: enabled };
            }
        });
    };

    const handleSend = async (message: string, promptId: string, signal?: AbortSignal, enableDeepThinking?: boolean, enableWebSearch?: boolean) => {
        // 如果明确指定了功能开关状态，更新记录
        if (enableDeepThinking !== undefined) {
            updateFeatureState('deepThinking', enableDeepThinking);
        }

        if (enableWebSearch !== undefined) {
            updateFeatureState('webSearch', enableWebSearch);
        }

        if (!message.trim() || isLoading || !promptId) return;

        setStreamingSession(currentSession || '');

        // 重置思考相关状态
        updateThinking({
            content: '',
            time: 0,
            isComplete: false,
            show: true,
            isExpanded: true
        });

        // 重置网络检索数据
        setWebSearchData(null);

        // 重置渲染停止标志
        shouldStopRenderingRef.current = false;

        // 创建新的 AbortController 
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // 如果传入了signal，监听它的abort事件，但不直接中断请求，而是设置停止渲染标志
        if (signal) {
            signal.addEventListener('abort', () => {
                // 设置标志以停止渲染，但允许请求继续进行
                shouldStopRenderingRef.current = true;
                // 仅通知UI停止渲染，不实际中断请求
                setStreamingSession(null);
                console.log('流式输出已停止渲染');
            }, { once: true });
        }

        // 添加用户消息
        addMessage({
            role: 'user',
            content: message,
        }, currentSession || undefined);

        // 添加空的助手消息
        addMessage({
            role: 'assistant',
            content: '',
        }, currentSession || undefined);

        try {
            let currentContent = '';
            let currentThinkingContent = '';
            let thinkingTimeCounter = 0;
            let hasReceivedThinking = false;
            let currentWebSearchData: WebSearchResponse | null = null;
            // 保存停止时的最终内容
            let finalContentBeforeStop = '';

            // 用于控制是否允许显示流式内容
            let canShowStreamingContent = true;
            // 缓存所有接收到的消息块
            let messageBuffer = '';

            // 添加思考开始时间记录
            const thinkingStartTime = Date.now();

            await promptChat(
                {
                    prompt_id: promptId,
                    session_id: currentSession || '',
                    user_message: message,
                    history: sessionMessages.map((msg: Message) => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    enable_deep_thinking: enableDeepThinking,
                    web_search: enableWebSearch
                },
                {
                    signal: controller.signal,
                    onMessage: (messageChunk: string) => {
                        // 仅在未停止时处理
                        if (!shouldStopRenderingRef.current) {
                            // 始终更新当前内容变量和缓冲区
                            currentContent += messageChunk;
                            messageBuffer += messageChunk;

                            // 只有当允许显示流式内容时，才更新UI
                            if (canShowStreamingContent) {
                                console.log(`[${new Date().toISOString()}] 显示流式内容`,
                                    '是否有网络检索数据:', !!currentWebSearchData,
                                    '消息内容:', messageChunk);

                                if (currentWebSearchData) {
                                    updateAssistantMessage(
                                        currentContent,
                                        currentThinkingContent,
                                        currentSession || '',
                                        currentWebSearchData
                                    );
                                } else {
                                    updateAssistantMessage(
                                        currentContent,
                                        currentThinkingContent,
                                        currentSession || ''
                                    );
                                }
                            }
                        } else if (finalContentBeforeStop === '') {
                            // 如果已停止并且没有保存最终内容，则保存当前内容为最终内容
                            finalContentBeforeStop = currentContent;
                        }
                    },
                    onThinking: (thinkingChunk: string) => {
                        // 仅在未停止时更新思考内容
                        if (!shouldStopRenderingRef.current) {
                            currentThinkingContent += thinkingChunk;
                            // 计算思考时间（秒）
                            const currentTime = Math.floor((Date.now() - thinkingStartTime) / 1000);
                            updateThinking({
                                content: currentThinkingContent,
                                time: currentTime
                            });
                            hasReceivedThinking = true;
                        }
                    },
                    onWebSearch: (data: WebSearchResponse) => {
                        // 接收网络检索数据
                        if (!shouldStopRenderingRef.current) {
                            console.log(`[${new Date().toISOString()}] 接收到网络检索数据`,
                                '结果数量:', data.pages_count);

                            currentWebSearchData = data;
                            setWebSearchData(data);

                            // 立即更新消息，包含网络检索数据和已缓存的消息
                            console.log(`[${new Date().toISOString()}] 显示网络检索数据和缓存的消息`,
                                '缓存消息长度:', messageBuffer.length);

                            updateAssistantMessage(
                                messageBuffer,
                                currentThinkingContent,
                                currentSession || '',
                                data
                            );
                        }
                    },
                    onComplete: () => {
                        // 计算最终思考时间（秒）
                        const finalThinkingTime = Math.floor((Date.now() - thinkingStartTime) / 1000);

                        // 如果已停止，使用停止时的内容，否则使用当前内容
                        const finalContent = shouldStopRenderingRef.current && finalContentBeforeStop ?
                            finalContentBeforeStop : currentContent;

                        // 完成时，更新最后一条消息的思考内容和网络检索内容
                        if (hasReceivedThinking || currentWebSearchData) {
                            // 只有在实际收到网络检索数据时才传递
                            updateAssistantMessage(
                                finalContent,
                                currentThinkingContent,
                                currentSession || '',
                                currentWebSearchData || undefined // 确保类型安全
                            );
                        } else {
                            // 如果没有思考内容和网络检索内容，只更新消息内容
                            updateAssistantMessage(finalContent, undefined, currentSession || '');
                        }

                        updateThinking({
                            isComplete: true,
                            content: currentThinkingContent,
                            time: finalThinkingTime,
                            show: hasReceivedThinking
                        });

                        // 如果已经被标记为停止，添加指示符
                        if (shouldStopRenderingRef.current) {
                            // 只有在实际收到网络检索数据时才传递
                            if (currentWebSearchData) {
                                updateAssistantMessage(
                                    finalContent,
                                    currentThinkingContent,
                                    currentSession || '',
                                    currentWebSearchData // 这里已经通过if检查，确保不为null
                                );
                            } else {
                                updateAssistantMessage(finalContent, currentThinkingContent, currentSession || '');
                            }
                        }

                        // 完成后清除流式会话标记
                        setStreamingSession(null);
                        shouldStopRenderingRef.current = false;
                    },
                    onError: (error: Error) => {
                        // 实际错误时的处理
                        console.error("请求出错:", error);
                        updateAssistantMessage('抱歉，发生了一些错误。请稍后再试。', undefined, currentSession || '');
                        updateThinking({
                            isComplete: true,
                            show: false
                        });
                        setStreamingSession(null);
                        shouldStopRenderingRef.current = false;
                    }
                }
            );
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error("Error:", error);
                updateThinking({
                    isComplete: true,
                    show: false
                });
            }
            setStreamingSession(null);
            shouldStopRenderingRef.current = false;
        }
    };

    const handleToggleThinking = () => {
        updateThinking({
            isExpanded: !thinking.isExpanded
        });
    };

    const regenerateLastMessage = async (promptId: string, mode: 'regenerate' | 'continue', signal?: AbortSignal, enableDeepThinking?: boolean, enableWebSearch?: boolean) => {
        // 如果明确指定了功能开关状态，更新记录
        if (enableDeepThinking !== undefined) {
            updateFeatureState('deepThinking', enableDeepThinking);
        }

        if (enableWebSearch !== undefined) {
            updateFeatureState('webSearch', enableWebSearch);
        }

        if (!currentSession || sessionMessages.length === 0 || !promptId) return;

        // 找到最后一条用户消息
        const lastUserMessageIndex = [...sessionMessages].reverse().findIndex(msg => msg.role === 'user');
        if (lastUserMessageIndex === -1) return;

        const lastUserMessage = [...sessionMessages].reverse()[lastUserMessageIndex];

        // 设置当前会话为流式输出状态
        setStreamingSession(currentSession);

        // 重置思考相关状态
        updateThinking({
            content: '',
            time: 0,
            isComplete: false,
            show: true,
            isExpanded: true
        });

        // 重置网络检索数据
        setWebSearchData(null);

        // 重置渲染停止标志
        shouldStopRenderingRef.current = false;

        // 创建新的 AbortController
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // 如果传入了signal，监听它的abort事件
        if (signal) {
            signal.addEventListener('abort', () => {
                shouldStopRenderingRef.current = true;
                setStreamingSession(null);
                console.log('重新生成已停止渲染');
            }, { once: true });
        }

        try {
            // 为重新生成准备变量
            let currentContent = '';
            let currentThinkingContent = '';
            let hasReceivedThinking = false;
            let currentWebSearchData: WebSearchResponse | null = null;

            // 重新生成模式下，直接使用空字符串替换最后一条AI回复的内容（显示loading状态）
            if (mode === 'regenerate' && currentSession) {
                replaceLastAssistantMessage('', '', currentSession);
            }

            // 添加思考开始时间记录
            const thinkingStartTime = Date.now();

            // 过滤历史消息
            const filteredHistory = sessionMessages
                .filter(msg => msg.role !== 'assistant' || (mode === 'continue'))
                .map((msg: Message) => ({
                    role: msg.role,
                    content: msg.content
                }));

            await promptChat(
                {
                    prompt_id: promptId,
                    session_id: currentSession,
                    user_message: lastUserMessage.content,
                    history: filteredHistory,
                    enable_deep_thinking: enableDeepThinking,
                    web_search: enableWebSearch
                },
                {
                    signal: controller.signal,
                    onMessage: (messageChunk) => {
                        // 处理消息块逻辑
                        if (!shouldStopRenderingRef.current) {
                            currentContent += messageChunk;

                            // 更新当前生成的回复
                            replaceLastAssistantMessage(
                                currentContent,
                                currentThinkingContent,
                                currentSession,
                                currentWebSearchData || undefined
                            );
                        }
                    },
                    onThinking: (thinkingChunk) => {
                        if (!shouldStopRenderingRef.current) {
                            hasReceivedThinking = true;
                            currentThinkingContent += thinkingChunk;
                            const thinkingTimeCounter = Math.floor((Date.now() - thinkingStartTime) / 1000);

                            // 更新思考状态
                            updateThinking({
                                content: currentThinkingContent,
                                time: thinkingTimeCounter,
                                show: true
                            });
                        }
                    },
                    onWebSearch: (searchData) => {
                        if (!shouldStopRenderingRef.current) {
                            currentWebSearchData = searchData;
                            setWebSearchData(searchData);
                        }
                    },
                    onComplete: () => {
                        // 计算最终思考时间
                        const finalThinkingTime = Math.floor((Date.now() - thinkingStartTime) / 1000);

                        // 更新思考状态为完成
                        updateThinking({
                            isComplete: true,
                            content: currentThinkingContent,
                            time: finalThinkingTime,
                            show: hasReceivedThinking
                        });

                        // 确保最终回复内容被正确更新
                        replaceLastAssistantMessage(
                            currentContent,
                            currentThinkingContent,
                            currentSession,
                            currentWebSearchData || undefined
                        );

                        // 完成后清除流式会话标记
                        setStreamingSession(null);
                        shouldStopRenderingRef.current = false;
                    },
                    onError: (error) => {
                        console.error("重新生成请求出错:", error);
                        replaceLastAssistantMessage('抱歉，重新生成失败。请稍后再试。', undefined, currentSession);
                        updateThinking({
                            isComplete: true,
                            show: false
                        });
                        setStreamingSession(null);
                        shouldStopRenderingRef.current = false;
                    }
                }
            );
        } catch (error) {
            console.error("重新生成失败:", error);
            setStreamingSession(null);
            shouldStopRenderingRef.current = false;
        }
    };

    const updatePromptConfig = (updates: Partial<{
        enableDeepThinking: boolean;
        enableWebSearch: boolean;
    }>) => {
        setPromptConfig(prev => ({
            ...prev,
            ...updates
        }));
    };

    return {
        messages: sessionMessages,
        isLoading,
        currentPromptId,
        currentSession,
        thinkingContent: thinking.content,
        showThinking: thinking.show,
        thinkingTime: thinking.time,
        isThinkingExpanded: thinking.isExpanded,
        isThinkingComplete: thinking.isComplete,
        webSearchData,
        handleSend,
        handleToggleThinking,
        regenerateLastMessage,
        promptConfig,
        updatePromptConfig
    };
} 