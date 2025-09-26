"use client"

import { AssistantMessage, UserMessage } from "../message-bubble";
import { MessageListProps, MessageExtended } from "../types";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function MessageList({
    messages,
    isLoading = false,
    thinkingContent = "",
    showThinking = false,
    thinkingTime = 0,
    isThinkingExpanded = true,
    webSearchData = null,
    onToggleThinking,
    onRegenerate,
    messagesEndRef
}: MessageListProps) {
    // 跟踪每条消息的展开状态
    const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

    // 为每条消息生成唯一ID
    const getMessageKey = (message: MessageExtended, index: number) => {
        return `msg-${index}-${message.role}`;
    };

    // 初始化所有消息的展开状态
    useEffect(() => {
        const newExpandedStates = { ...expandedStates };

        // 为所有消息设置展开状态
        messages.forEach((message, index) => {
            const messageKey = getMessageKey(message, index);
            // 如果没有状态，设置为默认展开
            if (expandedStates[messageKey] === undefined) {
                newExpandedStates[messageKey] = true;
            }
        });

        setExpandedStates(newExpandedStates);
    }, [messages.length]);

    // 处理重新生成消息
    const handleRegenerate = (mode: 'regenerate' | 'continue') => {
        if (onRegenerate) {
            onRegenerate(mode);
        }
    };

    // 没有消息时显示欢迎信息
    if (messages.length === 0) {
        return (
            <div className="py-8 flex flex-col items-center justify-center text-center w-full px-2">
                <p className="text-foreground dark:text-muted-foreground">
                    嗨～✨ 我是qwen AI！你的超能AI小助手⚡️，24小时在线答疑解惑📚、陪你脑洞大开创作🎉，随时甩开烦恼，解锁快乐日常～🌟
                </p>
            </div>
        );
    }

    return (
        <div className="w-full py-4 space-y-4 px-2">
            {messages.map((message, index) => {
                const messageKey = getMessageKey(message, index);
                const isLastMessage = index === messages.length - 1;
                const isAssistant = message.role === 'assistant';

                // 确定是否应该显示当前正在进行的思考和网络搜索
                const shouldShowCurrentThinking = isLastMessage && isAssistant && showThinking && thinkingContent;
                const shouldShowCurrentWebSearch = isLastMessage && isAssistant && webSearchData !== null;

                return (
                    <div
                        key={`container-${messageKey}`}
                        className="message-container w-full overflow-hidden"
                    >
                        {isAssistant ? (
                            <AssistantMessage
                                content={message.content}
                                isLoading={isLoading && isLastMessage}
                                metadata={{
                                    thinking: shouldShowCurrentThinking ? thinkingContent : message.think_content,
                                    thinkingTime: shouldShowCurrentThinking ? thinkingTime : message.thinkingTime,
                                    webSearchData: shouldShowCurrentWebSearch ? webSearchData : message.web_search_data
                                }}
                                actions={{
                                    onRegenerate: isLastMessage && onRegenerate ? handleRegenerate : undefined
                                }}
                            />
                        ) : (
                            <UserMessage
                                content={message.content}
                            />
                        )}
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
} 