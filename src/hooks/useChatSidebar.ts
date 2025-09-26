import { useState, useCallback } from "react"
import { ChatSession, groupSessionsByTime } from "@/store/chat-store"
import { useChatStore } from "@/store/chat-store"

/**
 * 聊天侧边栏 Hook 的参数接口
 */
export interface UseChatSidebarProps {
    sessions: ChatSession[]                   // 所有会话列表
    currentSession: string | null             // 当前选中的会话ID
    onNewSession: () => void                  // 创建新会话的回调
    onSelectSession: (sessionId: string) => void  // 选择会话的回调
    onDeleteSession: (sessionId: string) => void  // 删除会话的回调
}

/**
 * 聊天侧边栏 Hook 的返回值接口
 */
export interface UseChatSidebarReturn {
    groupedSessions: {
        today: ChatSession[]
        thisWeek: ChatSession[]
        thisMonth: ChatSession[]
        older: ChatSession[]
    }
    importError: string | null
    setImportError: (error: string | null) => void
    handleNewSession: () => void
    handleDeleteSession: (sessionId: string, e: React.MouseEvent) => void
    handleClearAllSessions: () => void
    handleExportSessions: () => void
    handleImportSessions: (event: React.ChangeEvent<HTMLInputElement>) => void
    getSessionTitle: (session: ChatSession) => string
    getLastMessage: (session: ChatSession) => string
}

/**
 * 聊天侧边栏逻辑 Hook
 * 
 * 提取所有侧边栏的业务逻辑，使组件更加清晰
 */
export function useChatSidebar({
    sessions,
    currentSession,
    onNewSession,
    onSelectSession,
    onDeleteSession,
}: UseChatSidebarProps): UseChatSidebarReturn {
    // 状态管理
    const [importError, setImportError] = useState<string | null>(null)

    // 从Zustand store获取方法
    const { clearSessions, exportSessions, importSessions } = useChatStore()

    // 直接使用传入的会话数据进行分组
    const groupedSessions = groupSessionsByTime(sessions)

    /**
     * 新建对话处理函数
     */
    const handleNewSession = useCallback(() => {
        onNewSession();
    }, [onNewSession]);

    /**
     * 删除会话处理函数
     */
    const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
        if (!sessionId) return;
        e.stopPropagation();

        // 直接调用父组件提供的删除方法
        onDeleteSession(sessionId);
    }, [onDeleteSession]);

    /**
     * 清空所有会话处理函数
     */
    const handleClearAllSessions = useCallback(() => {
        try {
            clearSessions();
            onNewSession();
        } catch (error) {
            console.error("清空会话时出错:", error);
        }
    }, [clearSessions, onNewSession]);

    /**
     * 导出会话处理函数
     */
    const handleExportSessions = useCallback(() => {
        const jsonData = exportSessions()
        const blob = new Blob([jsonData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `chat-sessions-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()

        // 清理
        setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }, 0)
    }, [exportSessions]);

    /**
     * 导入会话处理函数
     */
    const handleImportSessions = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const jsonData = e.target?.result as string
                let sessionsData: ChatSession[]

                try {
                    sessionsData = JSON.parse(jsonData)

                    if (!Array.isArray(sessionsData)) {
                        throw new Error("无效的会话数据格式")
                    }

                    // 导入会话
                    importSessions(sessionsData)

                    // 通知用户导入成功，刷新页面
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                } catch (parseError) {
                    setImportError('导入失败：无效的会话数据格式')
                }
            } catch (error) {
                setImportError('导入失败：无法解析文件')
                console.error('Import error:', error)
            }
        }
        reader.readAsText(file)
    }, [importSessions]);

    /**
     * 获取会话标题
     */
    const getSessionTitle = useCallback((session: ChatSession) => {
        if (!session || session.messages.length === 0) {
            return '新对话';
        }
        return session.title || '新对话';
    }, []);

    /**
     * 获取最后一条消息
     */
    const getLastMessage = useCallback((session: ChatSession) => {
        if (!session || session.messages.length === 0) {
            return '新对话';
        }

        const lastMessage = session.messages[session.messages.length - 1].content;
        return lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage;
    }, []);

    return {
        groupedSessions,
        importError,
        setImportError,
        handleNewSession,
        handleDeleteSession,
        handleClearAllSessions,
        handleExportSessions,
        handleImportSessions,
        getSessionTitle,
        getLastMessage
    };
} 