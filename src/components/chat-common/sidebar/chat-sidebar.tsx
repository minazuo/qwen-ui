"use client"

import { PlusCircle, MessageSquare, MoreVertical, Trash2, Download, Upload, Settings, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { SessionItemExtended } from "@/components/chat-common/types"

// 通用侧边栏属性
export interface ChatSidebarProps {
    sessions: SessionItemExtended[]
    currentSession: string | null
    onNewSession: () => void
    onSelectSession: (sessionId: string) => void
    onDeleteSession: (sessionId: string) => void
    onEditSessionTitle?: (sessionId: string, newTitle: string) => void
    mobileSidebar?: boolean
    className?: string
}

/**
 * 简单的内联标题编辑组件
 */
function EditableTitle({
    title,
    onSave,
    onCancel
}: {
    title: string,
    onSave: (newTitle: string) => void,
    onCancel: () => void
}) {
    const [value, setValue] = useState(title);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) onSave(value);
            else onCancel();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-6 py-0 px-1 text-sm"
                autoFocus
                onBlur={onCancel}
            />
        </div>
    );
}

/**
 * 通用聊天侧边栏组件
 */
export function ChatSidebar({
    sessions,
    currentSession,
    onNewSession,
    onSelectSession,
    onDeleteSession,
    onEditSessionTitle,
    mobileSidebar = false,
    className
}: ChatSidebarProps) {
    const [importError, setImportError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

    // 检测设备类型
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 640); // sm
        };

        // 初始检查
        checkScreenSize();

        // 监听窗口大小变化
        window.addEventListener('resize', checkScreenSize);

        // 清理监听器
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // 开始编辑标题
    const startEditing = (sessionId: string) => {
        setEditingSessionId(sessionId);
    };

    // 保存编辑后的标题
    const saveTitle = (sessionId: string, newTitle: string) => {
        if (onEditSessionTitle && newTitle.trim()) {
            onEditSessionTitle(sessionId, newTitle.trim());
        }
        setEditingSessionId(null);
    };

    // 取消编辑
    const cancelEditing = () => {
        setEditingSessionId(null);
    };

    // 处理会话导出
    const handleExportSessions = () => {
        try {
            const dataStr = JSON.stringify(sessions, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = `chat-sessions-${new Date().toISOString().slice(0, 10)}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        } catch (error) {
            console.error("导出会话失败:", error);
            setImportError("导出会话失败，请稍后再试");
        }
    };

    // 处理会话导入
    const handleImportSessions = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') {
                    throw new Error('导入的文件格式不正确');
                }

                const importedSessions = JSON.parse(result);

                // 这里仅模拟导入功能，实际应用中应将导入的会话集成到应用状态中
                console.log("导入的会话:", importedSessions);
                // 可以添加一个回调，例如 onImportSessions(importedSessions)

            } catch (error) {
                console.error("导入会话失败:", error);
                setImportError("导入会话失败，请确保文件格式正确");
            }
        };
        reader.readAsText(file);

        // 重置文件输入，以便可以重新导入同一个文件
        event.target.value = '';
    };

    // 处理清空所有会话
    const handleClearAllSessions = () => {
        // 这里仅模拟清空功能，实际应用中应使用传入的回调
        console.log("清空所有会话");
        // 可以添加一个回调，例如 onClearAllSessions()
    };

    // 处理删除会话
    const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        onDeleteSession(sessionId);
    };

    // 格式化日期
    const formatDate = (timestamp: Date | string | number): string => {
        const date = typeof timestamp === 'number' ? new Date(timestamp) :
            timestamp instanceof Date ? timestamp : new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const isThisYear = date.getFullYear() === now.getFullYear();
        if (isThisYear) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // 获取会话标题
    const getSessionTitle = (session: SessionItemExtended): string => {
        try {
            // 始终优先尝试从第一条用户消息中提取标题
            const firstUserMessage = session.messages?.find(m => m.role === 'user');
            if (firstUserMessage?.content) {
                const content = firstUserMessage.content.trim();
                const extractedTitle = content.length > 30 ? content.substring(0, 27) + '...' : content;
                return extractedTitle;
            }

            // 如果没有用户消息，再尝试使用会话title
            if (session.title) {
                // 确保title是字符串类型
                const title = typeof session.title === 'string' ? session.title :
                    session.title ? String(session.title) : '';

                // 检查是否为[object Object]字符串
                if (title === '[object Object]') {
                    return '新会话';
                }

                if (title.trim() !== '') {
                    return title;
                }
            }

            // 如果以上都没有，返回默认标题
            return `会话 ${new Date(session.timestamp).toLocaleDateString()}`;
        } catch (error) {
            console.error("获取会话标题时出错:", error);
            return "新会话";
        }
    };

    // 获取最后一条消息内容
    const getLastMessage = (session: SessionItemExtended): string => {
        const lastMessage = session.messages?.[session.messages.length - 1];
        if (!lastMessage) return '空会话';

        const content = lastMessage.content?.trim() || '';
        if (!content) return lastMessage.role === 'user' ? '用户消息' : 'AI回复';

        return content.length > 40 ? content.substring(0, 37) + '...' : content;
    };

    // 将会话按时间分组，使用稳定的排序逻辑
    const groupSessions = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const thisWeekStart = today - (now.getDay() || 7) * 86400000 + 86400000;
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        // 过滤出有消息的会话
        const sessionsWithMessages = sessions.filter(s => s.messages && s.messages.length > 0);

        // 使用一个更稳定的排序逻辑，不仅基于时间戳，也考虑会话ID
        const stableSortSessions = (a: any, b: any) => {
            // 首先按时间排序
            const timestampDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

            // 如果时间戳相同，按ID排序以保持稳定
            if (timestampDiff === 0) {
                return a.id.localeCompare(b.id);
            }

            return timestampDiff;
        };

        // 分组会话，每个组内使用稳定排序
        return {
            today: sessionsWithMessages
                .filter(s => {
                    const timestamp = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
                    return timestamp >= today;
                })
                .sort(stableSortSessions),
            thisWeek: sessionsWithMessages
                .filter(s => {
                    const timestamp = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
                    return timestamp >= thisWeekStart && timestamp < today;
                })
                .sort(stableSortSessions),
            thisMonth: sessionsWithMessages
                .filter(s => {
                    const timestamp = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
                    return timestamp >= thisMonthStart && timestamp < thisWeekStart;
                })
                .sort(stableSortSessions),
            older: sessionsWithMessages
                .filter(s => {
                    const timestamp = typeof s.timestamp === 'number' ? s.timestamp : new Date(s.timestamp).getTime();
                    return timestamp < thisMonthStart;
                })
                .sort(stableSortSessions)
        };
    };

    const groupedSessions = groupSessions();

    /**
     * 渲染会话组
     */
    const renderSessionGroup = (title: string, groupSessions: SessionItemExtended[]) => {
        if (!groupSessions || groupSessions.length === 0) return null;

        return (
            <div key={title} className="mb-2">
                <div className="px-4 py-2 text-xs text-muted-foreground font-medium">{title}</div>
                {groupSessions.map(session => renderSessionItem(session))}
            </div>
        );
    };

    /**
     * 渲染单个会话项
     */
    const renderSessionItem = (session: SessionItemExtended) => {
        if (!session.messages || session.messages.length === 0) return null;

        // 确保会话有标题
        const sessionTitle = getSessionTitle(session);
        const isEditing = editingSessionId === session.id;
        const isActive = currentSession === session.id;

        return (
            <div
                key={session.id}
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 group ${isActive
                    ? 'bg-accent/80 dark:bg-accent/30 border-l-4 border-primary'
                    : ''
                    }`}
                onClick={isEditing ? undefined : () => onSelectSession(session.id)}
                data-session-id={session.id}
                data-session-title={sessionTitle}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                            {isEditing ? (
                                <EditableTitle
                                    title={sessionTitle}
                                    onSave={(newTitle) => saveTitle(session.id, newTitle)}
                                    onCancel={cancelEditing}
                                />
                            ) : (
                                <p className="text-sm font-medium truncate">
                                    {sessionTitle || "无标题会话"}
                                </p>
                            )}
                            <span className="text-xs text-muted-foreground ml-2 shrink-0">
                                {formatDate(session.timestamp)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {getLastMessage(session)}
                        </p>
                    </div>
                </div>

                {!isEditing && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                                title="会话操作"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(session.id);
                                }}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                更改标题
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => handleDeleteSession(session.id, e)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除会话
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        );
    };

    // 过滤出有消息的会话
    const sessionsWithMessages = sessions.filter((s: SessionItemExtended) => s.messages && s.messages.length > 0);

    return (
        <>
            <div
                className={cn(
                    "bg-background/50 dark:bg-background backdrop-blur flex flex-col h-full shrink-0 w-full overflow-hidden border-r-2 border-border/50",
                    mobileSidebar ? "border-none" : "",
                    className
                )}
            >
                {/* 新建会话按钮 */}
                <div className="p-4 border-b border-border flex-shrink-0">
                    <Button
                        onClick={onNewSession}
                        className="w-full gap-2"
                        variant="outline"
                    >
                        <PlusCircle className="h-4 w-4" />
                        新建会话
                    </Button>
                </div>

                {/* 会话列表 */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {!sessionsWithMessages || sessionsWithMessages.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            暂无会话记录
                        </div>
                    ) : (
                        <div className="py-2">
                            {renderSessionGroup('今天', groupedSessions.today)}
                            {renderSessionGroup('本周', groupedSessions.thisWeek)}
                            {renderSessionGroup('本月', groupedSessions.thisMonth)}
                            {renderSessionGroup('更早', groupedSessions.older)}
                        </div>
                    )}
                </div>

                {/* 会话管理工具栏 */}
                <div className="p-3 border-t border-border flex justify-between bg-background/50 backdrop-blur flex-shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Settings className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={handleExportSessions}>
                                <Download className="h-4 w-4 mr-2" />
                                导出会话
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => document.getElementById('import-file')?.click()}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                导入会话
                                <input
                                    id="import-file"
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleImportSessions}
                                />
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={handleClearAllSessions}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                清空所有会话
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="text-xs text-muted-foreground flex items-center">
                        {sessionsWithMessages.length} 个会话
                    </div>
                </div>
            </div>

            {/* 导入错误提示 */}
            {importError && (
                <AlertDialog
                    open={!!importError}
                    onOpenChange={(open) => !open && setImportError(null)}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>导入失败</AlertDialogTitle>
                            <AlertDialogDescription>
                                {importError}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setImportError(null)}>
                                确定
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    )
} 