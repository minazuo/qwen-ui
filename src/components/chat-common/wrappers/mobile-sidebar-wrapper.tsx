"use client"

import { MobileSidebar as CommonMobileSidebar } from "../sidebar/mobile-sidebar"
import { ChatSession } from "@/store/chat-store"
import { SessionItemExtended } from "@/components/chat-common/types"

// 适配器函数：将ChatSession转换为SessionItemExtended
function adaptChatSessions(sessions: ChatSession[]): SessionItemExtended[] {
    return sessions.map(session => ({
        ...session,
        // 保持timestamp为Date类型或字符串类型
        timestamp: session.timestamp
    }));
}

interface MobileSidebarWrapperProps {
    sessions: ChatSession[]
    currentSession: string | null
    onNewSession: () => void
    onSelectSession: (sessionId: string) => void
    onDeleteSession: (sessionId: string) => void
    onEditSessionTitle?: (sessionId: string, newTitle: string) => void
    className?: string
}

export function MobileSidebar(props: MobileSidebarWrapperProps) {
    // 适配会话数据类型
    const adaptedSessions = adaptChatSessions(props.sessions);

    // 传递转换后的数据给通用组件
    return (
        <CommonMobileSidebar
            {...props}
            sessions={adaptedSessions}
        />
    )
} 