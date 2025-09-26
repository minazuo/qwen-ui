"use client"

import { useState, useEffect, useRef, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// 定义容器配置接口
export interface ChatContainerConfig {
    // 布局配置
    sidebarWidth?: {
        minWidth: string;
        maxWidth: string;
        defaultWidth: string;
    };
    contentMaxWidth?: string;
    showScrollButton?: boolean;

    // 样式配置
    containerClassName?: string;
    sidebarClassName?: string;
    contentClassName?: string;
    inputAreaClassName?: string;
}

// 定义容器组件属性
export interface ChatContainerProps {
    // 子组件插槽
    sidebar?: ReactNode;
    mobileSidebar?: ReactNode;
    messageList?: ReactNode;
    inputArea?: ReactNode;

    // 基础属性
    messagesEndRef?: React.RefObject<HTMLDivElement>;
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
    onScrollToBottom?: (isSmooth?: boolean) => void;
    isMobile?: boolean;

    // 配置选项
    config?: ChatContainerConfig;
    className?: string;
}

export function ChatContainer({
    sidebar,
    mobileSidebar,
    messageList,
    inputArea,
    messagesEndRef,
    scrollContainerRef: externalScrollContainerRef,
    onScrollToBottom,
    isMobile: externalIsMobile,
    config = {},
    className
}: ChatContainerProps) {
    // 应用默认配置
    const {
        sidebarWidth = {
            minWidth: "200px",
            maxWidth: "260px",
            defaultWidth: "15%"
        },
        contentMaxWidth = "70%",
        showScrollButton = true,
        containerClassName = "",
        sidebarClassName = "",
        contentClassName = "",
        inputAreaClassName = ""
    } = config;

    // 内部状态
    const [showScrollButtonState, setShowScrollButton] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    // 内部引用
    const internalScrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = externalScrollContainerRef || internalScrollContainerRef;

    // 检测设备类型（如果外部未提供）
    useEffect(() => {
        if (externalIsMobile !== undefined) {
            setIsMobile(externalIsMobile);
            return;
        }

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
    }, [externalIsMobile]);

    // 滚动到底部方法
    const scrollToBottom = (isSmooth = false) => {
        if (onScrollToBottom) {
            onScrollToBottom(isSmooth);
            return;
        }

        const container = scrollContainerRef.current;
        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: isSmooth ? 'smooth' : 'auto'
        });
    };

    // 监听滚动事件，检查是否显示向下滚动按钮
    useEffect(() => {
        if (!showScrollButton) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // 检查是否滚动到底部（考虑一些容差）
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            setShowScrollButton(!isAtBottom);
        };

        container.addEventListener('scroll', handleScroll);
        // 初始检查
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef, showScrollButton]);

    return (
        <div className={cn("flex h-full overflow-hidden w-full max-w-[100vw]", containerClassName, className)}>
            {/* 桌面端侧边栏 - 在移动端隐藏 */}
            {!isMobile && sidebar && (
                <div
                    className={cn(
                        "h-full overflow-hidden shrink-0 border-r border-border/40",
                        sidebarClassName
                    )}
                    style={{
                        width: sidebarWidth.defaultWidth,
                        minWidth: sidebarWidth.minWidth,
                        maxWidth: sidebarWidth.maxWidth
                    }}
                >
                    {sidebar}
                </div>
            )}

            {/* 主聊天区域 */}
            <div className="flex-1 flex flex-col h-full overflow-hidden border-0 w-full max-w-[100vw]">
                {/* 移动端侧边栏 */}
                {isMobile && mobileSidebar}

                {/* 消息列表区域 - 唯一可滚动区域 */}
                <div
                    className={cn("flex-1 w-full overflow-y-auto relative overflow-x-hidden", contentClassName)}
                    ref={scrollContainerRef}
                >
                    <div
                        className={cn(
                            "w-full mx-auto px-2 sm:px-4 lg:px-5 py-4",
                            {
                                "max-w-[100%] sm:max-w-[80%] lg:max-w-[70%]": !contentMaxWidth
                            },
                            contentClassName
                        )}
                        style={contentMaxWidth ? { maxWidth: contentMaxWidth } : undefined}
                    >
                        {messageList}
                        {messagesEndRef && <div ref={messagesEndRef} />}
                    </div>
                </div>

                {/* 输入区域 - 固定在底部 */}
                <div className={cn(
                    "w-full bg-gradient-to-b from-background/0 via-background/80 to-background pb-[0.5%] sm:pb-[1%] md:pb-[1.5%] pt-[0.5%] sm:pt-[1.5%] md:pt-[2%] relative",
                    inputAreaClassName
                )}>
                    {/* 悬浮滚动按钮 */}
                    {showScrollButton && showScrollButtonState && (
                        <Button
                            className="absolute left-1/2 -translate-x-1/2 -translate-y-[2vh] sm:-translate-y-[3vh] h-auto aspect-square w-[5%] min-w-[2rem] max-w-[3rem] rounded-full flex items-center justify-center shadow-sm sm:shadow-lg bg-primary hover:bg-primary/90 z-10"
                            onClick={() => scrollToBottom(true)}
                            title="滚动到底部"
                        >
                            <ChevronDown className="h-[40%] w-[40%] text-primary-foreground" />
                        </Button>
                    )}
                    <div className="w-full max-w-[100%] sm:max-w-[80%] lg:max-w-[70%] mx-auto px-2 sm:px-4 lg:px-5">
                        <div className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border/50 sm:border rounded-lg sm:rounded-xl shadow-none sm:shadow-lg p-2 sm:p-3 md:p-4">
                            {inputArea}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 