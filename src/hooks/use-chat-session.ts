import { useRef, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { recommendChat, WebSearchResponse } from "@/services/chat/chat";
import { chatWithFile } from "@/services/chat/chat_with_file";
import { useChatStore } from "@/store/chat-store";
import { useUserStore } from "@/store/user";
import type { ChatMessage, ChatSession } from "@/store/chat-store";

interface Message {
    role: 'user' | 'assistant';
    content: string;
    think_content?: string;
    thinkingTime?: number;
    web_search_data?: WebSearchResponse;
}

interface UseChatSessionReturn {
    messages: Message[];
    isLoading: boolean;
    sessions: ChatSession[];
    currentSession: string | null;
    thinkingContent: string;
    showThinking: boolean;
    thinkingTime: number;
    isThinkingExpanded: boolean;
    isThinkingComplete: boolean;
    webSearchData: WebSearchResponse | null;
    handleSend: (message: string, enableDeepThinking: boolean, enableWebSearch: boolean, signal?: AbortSignal, files?: File[], imageFiles?: File[]) => Promise<void>;
    createNewSession: () => void;
    deleteSession: (sessionId: string) => void;
    handleSelectSession: (sessionId: string) => void;
    handleToggleThinking: () => void;
    regenerateLastMessage: (mode: 'regenerate' | 'continue', signal?: AbortSignal) => Promise<void>;
}

export function useChatSession(): UseChatSessionReturn {
    const abortControllerRef = useRef<AbortController | null>(null);
    // 使用标志变量控制是否停止渲染
    const shouldStopRenderingRef = useRef<boolean>(false);
    // 存储网络检索数据
    const [webSearchData, setWebSearchData] = useState<WebSearchResponse | null>(null);
    // 存储当前会话的消息
    const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
    // 用于存储隐藏时接收到的消息块
    const messageBufferRef = useRef<string>('');
    // 页面是否可见
    const isPageVisibleRef = useRef<boolean>(true);

    // 从 store 获取状态和方法
    const {
        sessions,
        currentSession,
        thinking,
        isLoading,
        addMessage,
        updateAssistantMessage,
        updateThinking,
        createNewSession: createNew,
        deleteSession: deleteSessionFromStore,
        selectSession,
        setStreamingSession,
        setThinkModel,
        replaceLastAssistantMessage
    } = useChatStore();

    // 当会话变化时获取消息
    useEffect(() => {
        if (currentSession) {
            const sessionIndex = sessions.findIndex(s => s.id === currentSession);
            if (sessionIndex !== -1) {
                setSessionMessages(sessions[sessionIndex].messages.map(msg => ({
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

    // 添加页面可见性事件监听
    useEffect(() => {
        // 处理页面可见性变化
        const handleVisibilityChange = () => {
            isPageVisibleRef.current = document.visibilityState === 'visible';

            // 当页面重新变为可见时，如果有缓冲的消息，立即更新显示
            if (isPageVisibleRef.current && messageBufferRef.current && currentSession) {
                const sessionId = currentSession;
                const bufferedContent = messageBufferRef.current;
                messageBufferRef.current = ''; // 清空缓冲区

                // 从store获取最新状态并更新
                const store = useChatStore.getState();
                const session = store.sessions.find(s => s.id === sessionId);
                if (session) {
                    const lastAssistantMessage = [...session.messages].reverse().find(msg => msg.role === 'assistant');
                    if (lastAssistantMessage) {
                        // 拼接内容并更新
                        const updatedContent = lastAssistantMessage.content + bufferedContent;
                        store.updateAssistantMessage(
                            updatedContent,
                            lastAssistantMessage.think_content,
                            sessionId,
                            lastAssistantMessage.web_search_data
                        );
                    }
                }
            }
        };

        // 添加事件监听器
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 清理事件监听器
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentSession]);

    const handleSend = async (message: string, enableDeepThinking: boolean, enableWebSearch: boolean, signal?: AbortSignal, files?: File[], imageFiles?: File[]) => {
        // 如果没有消息内容且没有文件，则直接返回
        if (!message.trim() && (!files || files.length === 0) && (!imageFiles || imageFiles.length === 0) || isLoading) return;

        // 如果当前没有会话，会在 addMessage 中自动创建新会话
        const targetSessionId = currentSession || uuidv4();
        setStreamingSession(targetSessionId);

        // 获取用户设置存储的方法，同时更新全局状态
        const { setDeepThinking, setWebSearch } = useUserStore.getState();

        // 将当前的功能开关状态存储到全局状态中
        // 这样在页面刷新后也能保持用户的选择
        setDeepThinking(enableDeepThinking);
        setWebSearch(enableWebSearch);

        // 重置思考相关状态
        updateThinking({
            content: '',
            time: 0,
            isComplete: false,
            show: enableDeepThinking,
            isExpanded: true
        });

        // 重置网络检索数据
        setWebSearchData(null);

        // 重置渲染停止标志
        shouldStopRenderingRef.current = false;

        // 安全地处理之前的AbortController
        try {
            if (abortControllerRef.current) {
                // 为了避免错误，先将引用赋给临时变量，然后清空引用
                const prevController = abortControllerRef.current;
                abortControllerRef.current = null;

                // 尝试中止之前的请求，但捕获可能的错误
                try {
                    prevController.abort();
                } catch (abortError) {
                    console.log('安全中止之前的请求:', abortError);
                    // 忽略中止错误，继续执行
                }
            }
        } catch (error) {
            console.error('处理之前的AbortController时出错:', error);
            // 出错时也要确保继续执行
        }

        // 创建新的 AbortController 
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
        const userMessage: ChatMessage = {
            id: uuidv4(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };
        addMessage(userMessage, targetSessionId);

        // 添加空的助手消息
        const assistantMessage: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: '',
            timestamp: new Date()
        };
        addMessage(assistantMessage, targetSessionId);

        try {
            let currentContent = '';
            let currentThinkingContent = '';
            let thinkingTimeCounter = 0;
            let hasReceivedThinking = false;
            let currentWebSearchData: WebSearchResponse | null = null;
            // 保存停止时的最终内容
            let finalContentBeforeStop = '';

            // 用于控制是否允许显示流式内容
            let canShowStreamingContent = !enableWebSearch;
            // 缓存所有接收到的消息块
            let messageBuffer = '';
            // 网络检索等待超时器
            let webSearchTimeoutId: NodeJS.Timeout | null = null;

            // 添加思考开始时间记录
            const thinkingStartTime = Date.now();

            // 仅在会话中记录当前的功能状态，不影响全局用户设置
            if (currentSession) {
                // 更新会话的深度思考模式，但不触发userStore中的状态变更
                setThinkModel(enableDeepThinking, currentSession);
            }

            // 设置网络检索超时时间 - 如果启用了网络检索，但1.5秒内没有收到结果，就开始显示流式内容
            if (enableWebSearch) {
                webSearchTimeoutId = setTimeout(() => {
                    console.log('网络检索等待超时，开始显示流式内容');
                    canShowStreamingContent = true;
                    // 如果有缓存的消息，一次性显示出来
                    if (messageBuffer) {
                        updateAssistantMessage(
                            messageBuffer,
                            currentThinkingContent,
                            targetSessionId,
                            currentWebSearchData || undefined
                        );
                    }
                }, 1500); // 1.5秒超时
            }

            // 创建共享的回调对象
            const callbacks = {
                signal: controller.signal,
                onMessage: (messageChunk: string) => {
                    // 仅在未停止时处理
                    if (!shouldStopRenderingRef.current) {
                        // 始终更新当前内容变量和缓冲区
                        currentContent += messageChunk;
                        messageBuffer += messageChunk;

                        // 如果页面不可见，将消息存入缓冲区
                        if (!isPageVisibleRef.current) {
                            messageBufferRef.current += messageChunk;
                            return;
                        }

                        // 只有当允许显示流式内容时，才更新UI
                        if (canShowStreamingContent) {
                            console.log(`[${new Date().toISOString()}] 显示流式内容`,
                                '是否有网络检索数据:', !!currentWebSearchData,
                                '消息内容:', messageChunk);

                            if (currentWebSearchData) {
                                updateAssistantMessage(
                                    currentContent,
                                    currentThinkingContent,
                                    targetSessionId,
                                    currentWebSearchData
                                );
                            } else {
                                updateAssistantMessage(
                                    currentContent,
                                    currentThinkingContent,
                                    targetSessionId
                                );
                            }
                        } else {
                            console.log(`[${new Date().toISOString()}] 缓存流式内容而不显示`,
                                '等待网络检索数据',
                                '消息内容:', messageChunk);
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
                            '结果数量:', data.pages_count,
                            '当前缓存消息长度:', messageBuffer.length);

                        // 清除网络检索等待超时器
                        if (webSearchTimeoutId) {
                            clearTimeout(webSearchTimeoutId);
                            webSearchTimeoutId = null;
                            console.log(`[${new Date().toISOString()}] 清除网络检索超时计时器`);
                        }

                        currentWebSearchData = data;
                        setWebSearchData(data);

                        // 允许显示流式内容
                        canShowStreamingContent = true;
                        console.log(`[${new Date().toISOString()}] 设置允许显示流式内容`);

                        // 立即更新消息，包含网络检索数据和已缓存的消息
                        console.log(`[${new Date().toISOString()}] 显示网络检索数据和缓存的消息`,
                            '缓存消息长度:', messageBuffer.length);

                        updateAssistantMessage(
                            messageBuffer,
                            currentThinkingContent,
                            targetSessionId,
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
                            targetSessionId,
                            currentWebSearchData || undefined // 确保类型安全
                        );
                    } else {
                        // 如果没有思考内容和网络检索内容，只更新消息内容
                        updateAssistantMessage(finalContent, undefined, targetSessionId);
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
                                targetSessionId,
                                currentWebSearchData // 这里已经通过if检查，确保不为null
                            );
                        } else {
                            updateAssistantMessage(finalContent, currentThinkingContent, targetSessionId);
                        }
                    }

                    // 完成后清除流式会话标记
                    setStreamingSession(null);
                    shouldStopRenderingRef.current = false;
                },
                onError: (error: Error) => {
                    // 实际错误时的处理
                    console.error("请求出错:", error);
                    updateAssistantMessage('抱歉，发生了一些错误。请稍后再试。', undefined, targetSessionId);
                    updateThinking({
                        isComplete: true,
                        show: false
                    });
                    setStreamingSession(null);
                    shouldStopRenderingRef.current = false;
                }
            };

            // 根据是否上传文件决定使用哪个API
            if ((files && files.length > 0) || (imageFiles && imageFiles.length > 0)) {
                console.log('使用文件上传API');
                await chatWithFile(
                    {
                        session_id: targetSessionId,
                        message: message,
                        history: sessionMessages.map((msg: Message) => ({
                            role: msg.role,
                            content: msg.content
                        })),
                        enable_deep_thinking: enableDeepThinking,
                        web_search: enableWebSearch,
                        files: files,
                        image_files: imageFiles
                    },
                    callbacks
                );
            } else {
                console.log('使用常规聊天API');
                await recommendChat(
                    {
                        session_id: targetSessionId,
                        message: message,
                        history: sessionMessages.map((msg: Message) => ({
                            role: msg.role,
                            content: msg.content
                        })),
                        enable_deep_thinking: enableDeepThinking,
                        web_search: enableWebSearch
                    },
                    callbacks
                );
            }
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

            // 确保即使发生错误，也能显示错误信息
            try {
                updateAssistantMessage('抱歉，发生了错误。请稍后再试。', undefined, targetSessionId);
            } catch (uiError) {
                console.error("尝试更新UI状态时出错:", uiError);
            }
        }
    };

    // 简化为直接调用 store 方法
    const createNewSession = () => {
        createNew();
    };

    const deleteSession = (sessionId: string) => {
        deleteSessionFromStore(sessionId);
    };

    const handleSelectSession = (sessionId: string) => {
        selectSession(sessionId);
    };

    const handleToggleThinking = () => {
        updateThinking({
            isExpanded: !thinking.isExpanded
        });
    };

    const regenerateLastMessage = async (mode: 'regenerate' | 'continue', signal?: AbortSignal) => {
        if (!currentSession || sessionMessages.length === 0) return;

        // 获取store中的replaceLastAssistantMessage方法
        const { replaceLastAssistantMessage } = useChatStore.getState();

        // 找到最后一条用户消息
        const lastUserMessageIndex = [...sessionMessages].reverse().findIndex(msg => msg.role === 'user');
        if (lastUserMessageIndex === -1) return;

        const lastUserMessage = [...sessionMessages].reverse()[lastUserMessageIndex];

        // 从用户设置中获取深度思考和网络检索参数
        const { enableDeepThinking, enableWebSearch, setDeepThinking, setWebSearch } = useUserStore.getState();

        // 确保状态被持久化保存
        // 在重新生成时，我们保持与用户之前的选择一致
        setDeepThinking(enableDeepThinking);
        setWebSearch(enableWebSearch);

        // 设置当前会话为流式输出状态
        setStreamingSession(currentSession);

        // 重置思考相关状态
        updateThinking({
            content: '',
            time: 0,
            isComplete: false,
            show: enableDeepThinking,
            isExpanded: true
        });

        // 重置网络检索数据
        setWebSearchData(null);

        // 重置渲染停止标志
        shouldStopRenderingRef.current = false;

        // 安全地处理之前的AbortController
        try {
            if (abortControllerRef.current) {
                // 为了避免错误，先将引用赋给临时变量，然后清空引用
                const prevController = abortControllerRef.current;
                abortControllerRef.current = null;

                // 尝试中止之前的请求，但捕获可能的错误
                try {
                    prevController.abort();
                } catch (abortError) {
                    console.log('安全中止之前的请求:', abortError);
                    // 忽略中止错误，继续执行
                }
            }
        } catch (error) {
            console.error('处理之前的AbortController时出错:', error);
            // 出错时也要确保继续执行
        }

        // 创建新的 AbortController
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
            let thinkingTimeCounter = 0;
            let hasReceivedThinking = false;
            let currentWebSearchData: WebSearchResponse | null = null;

            // 重新生成模式下，直接使用空字符串替换最后一条AI回复的内容（显示loading状态）
            if (mode === 'regenerate' && currentSession) {
                replaceLastAssistantMessage('', '', currentSession);
            }

            // 添加思考开始时间记录
            const thinkingStartTime = Date.now();

            await recommendChat(
                {
                    session_id: currentSession,
                    message: lastUserMessage.content,
                    history: sessionMessages
                        .filter(msg => msg.role !== 'assistant' || (mode === 'continue'))
                        .map((msg: Message) => ({
                            role: msg.role,
                            content: msg.content
                        })),
                    enable_deep_thinking: enableDeepThinking,
                    web_search: enableWebSearch,
                    regenerate_mode: mode
                },
                {
                    signal: controller.signal,
                    onMessage: (messageChunk) => {
                        // 处理消息块逻辑与handleSend相同，但使用replaceLastAssistantMessage替代updateAssistantMessage
                        if (!shouldStopRenderingRef.current) {
                            currentContent += messageChunk;

                            // 如果页面不可见，将消息存入缓冲区
                            if (!isPageVisibleRef.current) {
                                messageBufferRef.current += messageChunk;
                                return;
                            }

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
                            thinkingTimeCounter = Math.floor((Date.now() - thinkingStartTime) / 1000);

                            // 更新思考状态
                            updateThinking({
                                content: currentThinkingContent,
                                time: thinkingTimeCounter,
                                show: enableDeepThinking
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

            // 确保即使发生错误，也能重置UI状态
            try {
                replaceLastAssistantMessage('抱歉，重新生成时发生错误。请稍后再试。', undefined, currentSession);
            } catch (uiError) {
                console.error("尝试更新UI状态时出错:", uiError);
            }
        }
    };

    return {
        messages: sessionMessages,
        isLoading,
        sessions,
        currentSession,
        thinkingContent: thinking.content,
        showThinking: thinking.show,
        thinkingTime: thinking.time,
        isThinkingExpanded: thinking.isExpanded,
        isThinkingComplete: thinking.isComplete,
        webSearchData,
        handleSend,
        createNewSession,
        deleteSession,
        handleSelectSession,
        handleToggleThinking,
        regenerateLastMessage
    };
} 