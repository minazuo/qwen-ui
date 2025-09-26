"use client"

import { ReactNode } from "react"
import { ChatContainer as CommonChatContainer, ChatContainerConfig } from "../container/chat-container"

interface ChatContainerWrapperProps {
    sidebar?: ReactNode;
    mobileSidebar?: ReactNode;
    messageList?: ReactNode;
    inputArea?: ReactNode;
    messagesEndRef?: React.RefObject<HTMLDivElement>;
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
    onScrollToBottom?: (isSmooth?: boolean) => void;
    isMobile?: boolean;
    isLoading?: boolean;
    isChangingSession?: boolean;
    className?: string;
    config?: ChatContainerConfig;
}

export function ChatContainer({
    sidebar,
    mobileSidebar,
    messageList,
    inputArea,
    messagesEndRef,
    scrollContainerRef,
    onScrollToBottom,
    isMobile,
    className,
    config = {},
    ...rest
}: ChatContainerWrapperProps) {
    // 合并默认配置和用户配置
    const mergedConfig: ChatContainerConfig = {
        sidebarWidth: {
            minWidth: "200px",
            maxWidth: "260px",
            defaultWidth: "15%"
        },
        showScrollButton: true,
        containerClassName: "",
        sidebarClassName: "shadow-sm",
        contentClassName: "",
        inputAreaClassName: "",
        ...config
    };

    return (
        <CommonChatContainer
            sidebar={sidebar}
            mobileSidebar={mobileSidebar}
            messageList={messageList}
            inputArea={inputArea}
            messagesEndRef={messagesEndRef}
            scrollContainerRef={scrollContainerRef}
            onScrollToBottom={onScrollToBottom}
            isMobile={isMobile}
            className={className}
            config={mergedConfig}
        />
    )
} 