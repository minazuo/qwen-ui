"use client"

import { ChatSidebar as CommonChatSidebar } from "../sidebar/chat-sidebar"
import { SessionItemExtended } from "@/components/chat-common/types"
import { ChatSession } from "@/store/chat-store"

// 适配器函数：将ChatSession转换为SessionItemExtended
function adaptChatSessions(sessions: ChatSession[]): SessionItemExtended[] {
    return sessions.map(session => ({
        id: session.id,
        title: session.title,
        // SessionItemExtended的timestamp可以是Date或string类型
        timestamp: session.timestamp,
        messages: session.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            think_content: msg.think_content,
            thinkingTime: msg.thinkingTime,
            web_search_data: msg.web_search_data
        })),
        // 保留其他可能有用的字段
        model: session.model,
        enableDeepThinking: session.enableDeepThinking
    }));
}

interface ChatSidebarWrapperProps {
    sessions: ChatSession[]
    currentSession: string | null
    onNewSession: () => void
    onSelectSession: (sessionId: string) => void
    onDeleteSession: (sessionId: string) => void
    onEditSessionTitle?: (sessionId: string, newTitle: string) => void
    mobileSidebar?: boolean
    className?: string
}

export function ChatSidebar(props: ChatSidebarWrapperProps) {
    // 适配会话数据类型
    const adaptedSessions = adaptChatSessions(props.sessions);

    // 传递转换后的数据给通用组件
    return (
        <CommonChatSidebar
            {...props}
            sessions={adaptedSessions}
        />
    )
} 