"use client"

import { useState, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ChatSidebar } from "./chat-sidebar";
import { SessionItemExtended } from "@/components/chat-common/types";

export interface MobileSidebarProps {
    sessions: SessionItemExtended[];
    currentSession: string | null;
    onNewSession: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onEditSessionTitle?: (sessionId: string, newTitle: string) => void;
    className?: string;
}

export function MobileSidebar({
    sessions,
    currentSession,
    onNewSession,
    onSelectSession,
    onDeleteSession,
    onEditSessionTitle,
    className
}: MobileSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // 检测是否为移动设备
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768); // md 断点
        };

        // 初始检查
        checkIsMobile();

        // 监听窗口大小变化
        window.addEventListener('resize', checkIsMobile);

        // 清理监听器
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // 控制body的overflow，防止侧边栏打开时页面可滚动
    useEffect(() => {
        if (isOpen && isMobile) {
            // 侧边栏打开时，禁止body滚动
            document.body.style.overflow = 'hidden';
        } else {
            // 侧边栏关闭时，恢复body滚动
            document.body.style.overflow = '';
        }

        return () => {
            // 组件卸载时恢复body滚动
            document.body.style.overflow = '';
        };
    }, [isOpen, isMobile]);

    const handleSelectSession = (sessionId: string) => {
        onSelectSession(sessionId);
        setIsOpen(false);
    };

    const handleNewSession = () => {
        onNewSession();
        setIsOpen(false);
    };

    // 如果不是移动设备，不渲染此组件
    if (!isMobile) return null;

    return (
        <div className={`fixed top-14 right-2 z-40 ${className || ''}`}>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" className="rounded-full h-auto min-h-[2.5rem] py-1 px-3 bg-background/80 backdrop-blur flex items-center gap-2">
                        <MessageSquare className="h-[1.25rem] w-[1.25rem]" />
                        <span className="text-sm">对话管理</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-[85vw] max-w-[320px] z-50 top-0 h-screen border-0 shadow-none">
                    <SheetHeader className="p-4 border-b">
                        <div className="flex items-center justify-between">
                            <SheetTitle>会话管理</SheetTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-auto aspect-square min-h-[2rem] min-w-[2rem]"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </SheetHeader>
                    <div className="h-[calc(100%-4rem)] overflow-hidden">
                        <div className="h-full overflow-y-auto overflow-x-hidden">
                            <ChatSidebar
                                sessions={sessions}
                                currentSession={currentSession}
                                onNewSession={handleNewSession}
                                onSelectSession={handleSelectSession}
                                onDeleteSession={onDeleteSession}
                                onEditSessionTitle={onEditSessionTitle}
                                mobileSidebar={true}
                            />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
} 