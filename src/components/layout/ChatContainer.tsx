// 聊天容器

"use client"

import { ChatContainer as CommonChatContainer, ChatInput, ChatSidebar, MobileSidebar, MessageList } from "@/components/chat-common"
import { useChatSession } from "@/hooks/use-chat-session"
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom"
import { useEffect, useState, useRef, RefObject } from "react"
import { useChatStore } from "@/store/chat-store"
import { useUserStore } from "@/store/user"
import { ChatSession } from "@/store/chat-store"

interface ChatContainerContentProps {
    sessions: ChatSession[];
    isMobile: boolean;
    isTablet: boolean;
    isChangingSession: boolean;
    setIsChangingSession: (value: boolean) => void;
    isStreaming: boolean;
    setIsStreaming: (value: boolean) => void;
    streamControllerRef: RefObject<AbortController | null>;
    loadHistorySessions: () => Promise<void>;
}

export function ChatContainer() {
    const [isChangingSession, setIsChangingSession] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    // 用于控制流式输出的引用
    const streamControllerRef = useRef<AbortController | null>(null);

    // 从 store 中获取加载历史会话的方法和会话列表
    const loadHistorySessions = useChatStore(state => state.loadHistorySessions);
    const sessions = useChatStore(state => state.sessions);
    
    // 页面初始加载时获取历史会话
    useEffect(() => {
        const initializeApp = async () => {
            try {
                console.log('页面初始化，开始加载历史会话...');
                await loadHistorySessions();
                console.log('历史会话加载完成');
            } catch (error) {
                console.error('初始化应用失败:', error);
            } finally {
                setIsInitialLoading(false);
            }
        };
        
        initializeApp();
    }, []); // 只在组件挂载时执行一次
    
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 640); // sm
            setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024); // md-lg
        };

        // 初始检查
        checkScreenSize();

        // 监听窗口大小变化
        window.addEventListener('resize', checkScreenSize);

        // 清理监听器
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // 如果正在初始加载，显示加载指示器
    if (isInitialLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: '0ms' }} />
                        <div className="h-4 w-4 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: '150ms' }} />
                        <div className="h-4 w-4 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: '300ms' }} />
                    </div>
                    <p className="text-muted-foreground">正在加载历史会话...</p>
                </div>
            </div>
        );
    }

    // 只有在初始加载完成后才执行以下代码
    return <ChatContainerContent 
        sessions={sessions}
        isMobile={isMobile}
        isTablet={isTablet}
        isChangingSession={isChangingSession}
        setIsChangingSession={setIsChangingSession}
        isStreaming={isStreaming}
        setIsStreaming={setIsStreaming}
        streamControllerRef={streamControllerRef}
        loadHistorySessions={loadHistorySessions}
    />;
}

function ChatContainerContent({ 
    sessions,
    isMobile,
    isTablet,
    isChangingSession,
    setIsChangingSession,
    isStreaming,
    setIsStreaming,
    streamControllerRef,
    loadHistorySessions
}: ChatContainerContentProps) {
    const {
        messages,
        isLoading,
        currentSession,
        thinkingContent,
        showThinking,
        thinkingTime,
        isThinkingExpanded,
        isThinkingComplete,
        webSearchData,
        handleSend,
        createNewSession,
        deleteSession,
        handleSelectSession,
        handleToggleThinking,
        regenerateLastMessage
    } = useChatSession();

    // 添加调试日志
    useEffect(() => {
        console.log("ChatContainer中的消息数量:", messages.length);
        if (messages.length > 0) {
            // 避免大对象输出，只打印第一条和最后一条消息
            console.log("首条消息:", messages[0]);
            if (messages.length > 1) {
                console.log("末条消息:", messages[messages.length - 1]);
            }
        }
    }, [messages]);

    // 从store中获取更新会话标题的方法
    const updateSessionTitle = useChatStore(state => state.updateSessionTitle);

    // 处理编辑会话标题
    const handleEditSessionTitle = (sessionId: string, newTitle: string) => {
        if (sessionId && newTitle.trim()) {
            try {
                // 更新会话标题
                updateSessionTitle(sessionId, newTitle);

                // 如果是当前会话，可能需要更新页面标题
                if (sessionId === currentSession) {
                    // 这里可以添加页面标题更新逻辑，如果需要的话
                    console.log("当前会话标题已更新:", newTitle);
                }
            } catch (error) {
                console.error("编辑会话标题失败:", error);
            }
        }
    };

    // 当会话切换时添加短暂的加载状态
    useEffect(() => {
        setIsChangingSession(true);
        const timer = setTimeout(() => {
            setIsChangingSession(false);
        }, 50);
        return () => clearTimeout(timer);
    }, [currentSession, setIsChangingSession]);

    const { messagesEndRef, scrollContainerRef, scrollToBottom } = useScrollToBottom({
        messages,
        isLoading,
        thinkingContent,
        isChangingSession // 传递会话切换状态
    });

    // 处理消息发送并设置流式状态
    const handleSendMessage = async (message: string, enableDeepThinking: boolean, enableWebSearch: boolean, model?: 'QWEN' | 'DEEPSEEK', files?: File[], imageFiles?: File[]) => {
        // 创建新的 AbortController 用于控制流式请求
        streamControllerRef.current = new AbortController();

        setIsStreaming(true);
        try {
            // 将 AbortController 的 signal 传递给 handleSend 函数
            await handleSend(message, enableDeepThinking, enableWebSearch, streamControllerRef.current.signal, files, imageFiles);
        } catch (error) {
            // 对于AbortError，这是预期行为，不需要显示为错误
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error("流式请求出错:", error);
            } else if (error instanceof Error && error.name === 'AbortError') {
                console.log("流式输出已手动中断");
            }
        } finally {
            setIsStreaming(false);
            streamControllerRef.current = null;
        }
    };

    // 处理暂停流式输出
    const handleStopStreaming = () => {
        if (streamControllerRef.current) {
            // 使用更温和的方式中断流式输出，避免触发错误
            try {
                const abortEvent = new Event('abort');
                // 手动触发abort事件而不是调用abort()方法
                streamControllerRef.current.signal.dispatchEvent(abortEvent);
            } catch (error) {
                console.log("停止流式输出", error);
            } finally {
                // 仍然更新UI状态
                setIsStreaming(false);
            }
        }
    };

    // 处理重新生成消息
    const handleRegenerate = async (mode: 'regenerate' | 'continue') => {
        streamControllerRef.current = new AbortController();
        setIsStreaming(true);

        try {
            await regenerateLastMessage(mode, streamControllerRef.current.signal);
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                console.error("重新生成请求出错:", error);
            } else if (error instanceof Error && error.name === 'AbortError') {
                console.log("重新生成已手动中断");
            }
        } finally {
            setIsStreaming(false);
            streamControllerRef.current = null;
        }
    };

    // 准备子组件
    const sidebarComponent = (
        <ChatSidebar
            sessions={sessions}
            currentSession={currentSession}
            onNewSession={() => createNewSession()}
            onSelectSession={handleSelectSession}
            onDeleteSession={deleteSession}
            onEditSessionTitle={handleEditSessionTitle}
            className="shadow-md"
        />
    );

    const mobileSidebarComponent = (
        <MobileSidebar
            sessions={sessions}
            currentSession={currentSession}
            onNewSession={() => createNewSession()}
            onSelectSession={handleSelectSession}
            onDeleteSession={deleteSession}
            onEditSessionTitle={handleEditSessionTitle}
            className="z-50"
        />
    );

    const messageListComponent = !isChangingSession ? (
        <MessageList
            messages={messages}
            isLoading={isLoading}
            thinkingContent={thinkingContent}
            showThinking={showThinking}
            thinkingTime={thinkingTime}
            isThinkingExpanded={isThinkingExpanded}
            webSearchData={webSearchData}
            onToggleThinking={handleToggleThinking}
            onRegenerate={handleRegenerate}
            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
        />
    ) : null;

    const inputAreaComponent = (
        <ChatInput
            onSend={handleSendMessage}
            onStop={handleStopStreaming}
            isLoading={isLoading}
            isStreaming={isStreaming}
            options={{
                // 从用户存储中读取按钮的激活状态
                enableDeepThinking: useUserStore.getState().enableDeepThinking,
                enableWebSearch: useUserStore.getState().enableWebSearch,

                // 按钮在首页始终显示
                hideDeepThinking: false,
                hideWebSearch: false,

                availableModels: [],
                enableFileUpload: true,
                enableImageUpload: true
            }}
        />
    );

    return (
        <CommonChatContainer
            sidebar={sidebarComponent}
            mobileSidebar={mobileSidebarComponent}
            messageList={messageListComponent}
            inputArea={inputAreaComponent}
            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
            scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>}
            onScrollToBottom={scrollToBottom}
            isMobile={isMobile}
            isLoading={isLoading}
            isChangingSession={isChangingSession}
            config={{
                contentMaxWidth: "70%",
                contentClassName: "flex justify-center items-start"
            }}
        />
    );
}