import { useEffect, useRef, useState } from 'react';

interface UseScrollToBottomProps {
    messages: any[];
    isLoading: boolean;
    thinkingContent?: string;
    isChangingSession?: boolean;
}

export function useScrollToBottom({
    messages,
    isLoading,
    thinkingContent,
    isChangingSession = false
}: UseScrollToBottomProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [lastMessageContent, setLastMessageContent] = useState('');
    const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 检查是否在底部的函数
    const checkIfAtBottom = () => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const { scrollTop, scrollHeight, clientHeight } = container;
        // 考虑一个小的偏移量，这样用户轻微滚动不会立即禁用自动滚动
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAtBottom(atBottom);
    };

    // 滚动到底部的函数
    const scrollToBottom = (force = false) => {
        if (!scrollContainerRef.current) return;

        // 如果强制滚动或用户在底部，才执行滚动
        if (force || isAtBottom) {
            const container = scrollContainerRef.current;
            const scrollHeight = container.scrollHeight;

            container.scrollTo({
                top: scrollHeight,
                behavior: force ? 'auto' : 'auto' // 改为auto以确保即使在流式输出时也能立即滚动
            });
        }
    };

    // 监听滚动事件
    useEffect(() => {
        // 确保scrollContainerRef.current已经被设置
        if (scrollContainerRef.current) {
            // 添加滚动监听
            scrollContainerRef.current.addEventListener('scroll', checkIfAtBottom);

            // 初始检查
            checkIfAtBottom();

            // 初始化标记
            setIsInitialized(true);

            // 初始滚动到底部
            scrollToBottom(true);
        }

        return () => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.removeEventListener('scroll', checkIfAtBottom);
            }
        };
    }, [scrollContainerRef.current]);

    // 获取最后一条消息的内容
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            setLastMessageContent(lastMsg.content);
        }
    }, [messages]);

    // 会话切换时强制滚动到底部
    useEffect(() => {
        if (isChangingSession && isInitialized) {
            // 等待DOM更新后立即滚动
            setTimeout(() => {
                scrollToBottom(true);
            }, 100);
        }
    }, [isChangingSession, isInitialized]);

    // 处理流式响应期间的自动滚动
    useEffect(() => {
        // 清理之前的定时器
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }

        // 当消息正在加载(流式输出)，设置一个短间隔的滚动定时器
        if (isLoading && isInitialized && !isChangingSession) {
            scrollIntervalRef.current = setInterval(() => {
                // 只有当用户在底部时，才自动滚动
                if (isAtBottom) {
                    scrollToBottom();
                }
            }, 100); // 每100ms检查一次，以实现流畅的滚动体验
        }

        return () => {
            if (scrollIntervalRef.current) {
                clearInterval(scrollIntervalRef.current);
                scrollIntervalRef.current = null;
            }
        };
    }, [isLoading, isInitialized, isChangingSession, isAtBottom]);

    // 监听最后一条消息内容的变化
    useEffect(() => {
        // 确保容器已初始化
        if (!isInitialized) return;

        // 跳过会话切换的情况，那个有单独的处理
        if (isChangingSession) return;

        // 当最后一条消息内容变化时滚动到底部
        if (lastMessageContent && isAtBottom) {
            scrollToBottom();
        }
    }, [lastMessageContent, isInitialized, isChangingSession, isAtBottom]);

    // 监听thinking内容变化
    useEffect(() => {
        // 确保容器已初始化
        if (!isInitialized || !thinkingContent) return;

        // 当思考内容变化且用户在底部时滚动
        if (isAtBottom) {
            scrollToBottom();
        }
    }, [thinkingContent, isInitialized, isAtBottom]);

    return {
        messagesEndRef,
        scrollContainerRef,
        scrollToBottom,
        isAtBottom
    };
} 