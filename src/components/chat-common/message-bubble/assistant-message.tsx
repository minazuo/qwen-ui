"use client"

import { useState, useEffect, useRef } from "react"
import { Copy, Check, ThumbsUp, ThumbsDown, Share, RefreshCw, Brain, ChevronDown, ChevronUp, Clock, Search, ChevronRight, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/chat-common/renderer/markdown-renderer"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { MessageBubbleProps } from "../types"
import { WebPage } from "@/services/chat/chat"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from '@/components/ui/scroll-area'

export function AssistantMessage({
    content,
    metadata = {},
    isLoading = false,
    actions = {},
}: MessageBubbleProps) {
    const { toast } = useToast()
    const [copied, setCopied] = useState(false)
    const [liked, setLiked] = useState(false)
    const [disliked, setDisliked] = useState(false)
    const [thinkingExpanded, setThinkingExpanded] = useState(true)
    const contentRef = useRef(content || "")
    const [isRegenerating, setIsRegenerating] = useState(false)
    const previousContentRef = useRef(content)

    // 使用useEffect更新contentRef
    useEffect(() => {
        // 如果是第一次渲染或content非空，则更新内容
        if ((previousContentRef.current === undefined || previousContentRef.current === null) ||
            (content && content.length > 0)) {
            // 使用上一次内容比较，如果新内容比旧内容短，可能是重新生成开始，此时保留旧内容直到新内容增长
            if (previousContentRef.current &&
                content &&
                content.length < previousContentRef.current.length &&
                content === '') {
                // 这是重新生成开始，contentRef保持不变，直到新内容到达
                setIsRegenerating(true);
                console.log("检测到重新生成开始，保留旧内容直到新内容到达");
            } else {
                // 正常更新内容
                contentRef.current = content || "";
                // 非空内容到达，取消重新生成状态
                if (content && content.length > 0 && isRegenerating) {
                    setIsRegenerating(false);
                }
            }
        }

        // 保存当前content用于下次比较
        previousContentRef.current = content;

        // 调试日志 - 减少日志量，只在必要时打印
        if (isRegenerating) {
            console.log("AssistantMessage组件重新生成状态:", isRegenerating,
                "内容长度:", (content || "").length,
                "储存内容长度:", contentRef.current.length);
        }
    }, [content]); // 只依赖content，移除isRegenerating依赖

    const {
        thinking: thinkingContent,
        thinkingTime = 0,
        webSearchData
    } = metadata || {};

    // 从actions中获取回调函数，如果不存在则提供默认实现
    const {
        onRegenerate,
        onCopy: externalCopyHandler,
        onThumbsUp: externalLikeHandler,
        onThumbsDown: externalDislikeHandler,
        onShare: externalShareHandler,
    } = actions || {};

    // 复制内容到剪贴板
    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const success = document.execCommand('copy');
                textArea.remove();
                return success;
            } catch (error) {
                textArea.remove();
                return false;
            }
        } catch (error) {
            return false;
        }
    };

    const handleCopy = async () => {
        if (externalCopyHandler) {
            externalCopyHandler();
            return;
        }

        const success = await copyToClipboard(contentRef.current);
        if (success) {
            setCopied(true);
            toast({
                title: "已复制到剪贴板",
                duration: 2000,
            });
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast({
                title: "复制失败",
                variant: "destructive",
                duration: 2000,
            });
        }
    };

    const handleLike = () => {
        if (externalLikeHandler) {
            externalLikeHandler();
            return;
        }

        setLiked(!liked);
        if (disliked) setDisliked(false);
        toast({
            title: liked ? "已取消点赞" : "感谢您的反馈",
            duration: 2000,
        });
    };

    const handleDislike = () => {
        if (externalDislikeHandler) {
            externalDislikeHandler();
            return;
        }

        setDisliked(!disliked);
        if (liked) setLiked(false);
        toast({
            title: disliked ? "已取消点踩" : "感谢您的反馈",
            duration: 2000,
        });
    };

    const handleShare = async () => {
        if (externalShareHandler) {
            externalShareHandler();
            return;
        }

        const success = await copyToClipboard(contentRef.current);
        if (success) {
            toast({
                title: "已复制内容到剪贴板，可以分享给他人",
                duration: 2000,
            });
        } else {
            toast({
                title: "分享失败",
                variant: "destructive",
                duration: 2000,
            });
        }
    };

    const handleRegenerate = () => {
        if (onRegenerate) {
            setIsRegenerating(true);
            // 不清空内容，保留当前内容直到新内容出现
            onRegenerate('regenerate');
            toast({
                title: "正在重新生成回答",
                duration: 2000,
            });
        }
    };

    const toggleThinking = () => {
        setThinkingExpanded(!thinkingExpanded);
    };

    // 获取当前显示内容 - 修复闪烁问题的关键
    const displayContent = contentRef.current || ""
    const shouldShowActionButtons = displayContent.length > 0 && !isRegenerating

    return (
        <div className="message-container">
            {/* 网络搜索气泡 */}
            {webSearchData && (
                <div className="mb-4 w-full">
                    <Sheet>
                        <SheetTrigger className="w-full">
                            <div className="flex flex-row items-center border-l-4 pl-3 py-3 pr-3 transition-colors cursor-pointer hover:bg-muted/50 w-full ml-0 mr-auto">
                                <div className="flex-1 flex items-center">
                                    <Search className="h-4 w-4 text-muted-foreground mr-2" />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        已检索到 <span className="font-semibold">{webSearchData.pages_count}</span> 个相关结果
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </SheetTrigger>
                        <SheetContent className="w-[90%] sm:w-[80%] md:w-[70%] lg:w-[60%] max-w-[800px]">
                            <SheetHeader>
                                <div className="flex items-center justify-between">
                                    <SheetTitle>网络检索结果</SheetTitle>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-auto aspect-square w-auto min-h-[2rem] min-w-[2rem] rounded-full">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </SheetTrigger>
                                </div>
                                <SheetDescription>
                                    查询: "{webSearchData.query}" - 找到 {webSearchData.pages_count} 个结果
                                </SheetDescription>
                            </SheetHeader>

                            <ScrollArea className="h-[70vh] mt-4 pr-4">
                                <div className="space-y-4">
                                    {webSearchData.pages.map((page: WebPage, index: number) => (
                                        <div key={index} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-medium text-base text-blue-600 hover:underline line-clamp-2">
                                                    {page.title}
                                                </h3>
                                                <a
                                                    href={page.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center text-gray-500 hover:text-gray-700"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            </div>
                                            <a
                                                href={page.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-green-600 line-clamp-1 mb-2 block"
                                            >
                                                {page.url}
                                            </a>
                                            <p className="text-sm text-gray-700 line-clamp-3">
                                                {page.content}
                                            </p>
                                        </div>
                                    ))}

                                    {webSearchData.suggestions && webSearchData.suggestions.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium mb-2">相关搜索</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {webSearchData.suggestions.map((suggestion: string, index: number) => (
                                                    <span
                                                        key={index}
                                                        className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                                                    >
                                                        {suggestion}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="flex justify-center mt-4">
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full max-w-xs">
                                        关闭
                                    </Button>
                                </SheetTrigger>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            )}

            {/* 思考气泡 */}
            {thinkingContent && (
                <div className="mb-4 w-full ml-0 mr-auto">
                    <div
                        className="flex flex-row items-center border-l-4 pl-3 py-3 pr-3 transition-colors cursor-pointer hover:bg-muted/50 w-full"
                        onClick={toggleThinking}
                    >
                        <div className="flex-1 flex items-center space-x-2">
                            <Brain className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                                已深度思考（用时 {thinkingTime} 秒）
                            </span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 text-muted-foreground/70 mr-1" />
                            {thinkingExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    </div>

                    {thinkingExpanded && (
                        <div className="pl-7 pr-3 py-3">
                            <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-tight">
                                <MarkdownRenderer content={thinkingContent || '无思考内容'} className="prose-xs text-xs leading-tight [&_p]:my-1" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* AI回复气泡 */}
            <div className="group flex items-start flex-row gap-2 sm:gap-4 px-2 sm:px-0">
                <div className="flex flex-col gap-2 items-start w-full">
                    <div className="break-words w-full">
                        {/* 内容区域 - 始终显示，即使是空内容也显示加载指示器 */}
                        <div className="prose prose-neutral dark:prose-invert max-w-none">
                            {displayContent && <MarkdownRenderer content={displayContent} />}

                            {/* 加载指示器 */}
                            {(isLoading || isRegenerating) && (
                                <div className="flex items-center gap-2 py-1 mt-2">
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: '0ms' }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: '150ms' }} />
                                    <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>

                        {/* 操作按钮 - 只在有内容且不处于重新生成状态时显示 */}
                        {shouldShowActionButtons && (
                            <div className="flex flex-col mt-2">
                                <hr className="border-t border-border/50 my-0" />
                                <div className="flex justify-start items-center flex-nowrap space-x-1 sm:space-x-2 overflow-x-auto mt-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleCopy}
                                        className={cn(
                                            "h-auto aspect-square min-h-[1.75rem] min-w-[1.75rem] sm:h-auto sm:w-auto sm:px-2 sm:py-1 opacity-50 hover:opacity-100 flex-shrink-0",
                                            copied && "text-green-500"
                                        )}
                                    >
                                        {copied ? (
                                            <Check className="h-3.5 w-3.5 sm:mr-0.5" />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5 sm:mr-0.5" />
                                        )}
                                        <span className="hidden sm:inline">复制</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleLike}
                                        className={cn(
                                            "h-auto aspect-square min-h-[1.75rem] min-w-[1.75rem] sm:h-auto sm:w-auto sm:px-2 sm:py-1 opacity-50 hover:opacity-100 flex-shrink-0",
                                            liked && "text-green-500"
                                        )}
                                    >
                                        <ThumbsUp className="h-3.5 w-3.5 sm:mr-0.5" />
                                        <span className="hidden sm:inline">点赞</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleDislike}
                                        className={cn(
                                            "h-auto aspect-square min-h-[1.75rem] min-w-[1.75rem] sm:h-auto sm:w-auto sm:px-2 sm:py-1 opacity-50 hover:opacity-100 flex-shrink-0",
                                            disliked && "text-red-500"
                                        )}
                                    >
                                        <ThumbsDown className="h-3.5 w-3.5 sm:mr-0.5" />
                                        <span className="hidden sm:inline">点踩</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleShare}
                                        className="h-auto aspect-square min-h-[1.75rem] min-w-[1.75rem] sm:h-auto sm:w-auto sm:px-2 sm:py-1 opacity-50 hover:opacity-100 flex-shrink-0"
                                    >
                                        <Share className="h-3.5 w-3.5 sm:mr-0.5" />
                                        <span className="hidden sm:inline">分享</span>
                                    </Button>

                                    {onRegenerate && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleRegenerate}
                                            className={cn(
                                                "h-auto aspect-square min-h-[1.75rem] min-w-[1.75rem] sm:h-auto sm:w-auto sm:px-2 sm:py-1 opacity-50 hover:opacity-100 flex-shrink-0",
                                                isRegenerating && "bg-muted text-muted-foreground"
                                            )}
                                            disabled={isRegenerating}
                                        >
                                            <RefreshCw className={cn(
                                                "h-3.5 w-3.5 sm:mr-0.5",
                                                isRegenerating && "animate-spin"
                                            )} />
                                            <span className="hidden sm:inline">
                                                {isRegenerating ? "生成中..." : "重新生成"}
                                            </span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} 