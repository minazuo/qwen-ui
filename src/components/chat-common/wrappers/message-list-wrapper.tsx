"use client"

import { MessageList } from "../message-list"
import { adaptChatMessage } from "../adapters"
import { WebSearchResponse } from "@/services/chat/chat"
import { RefObject, useEffect } from "react"

// 兼容现有MessageList的接口
interface Message {
    role: 'user' | 'assistant';
    content: string;
    think_content?: string;
    thinkingTime?: number;
    web_search_data?: WebSearchResponse;
}

interface MessageListWrapperProps {
    messages: Message[];
    isLoading: boolean;
    thinkingContent: string;
    showThinking: boolean;
    thinkingTime: number;
    isThinkingExpanded: boolean;
    webSearchData: WebSearchResponse | null;
    onToggleThinking: () => void;
    onRegenerate?: (mode: 'regenerate' | 'continue') => void;
    messagesEndRef: RefObject<HTMLDivElement>;
}

/**
 * 包装组件 - 保持与现有组件接口兼容，但内部使用通用组件
 */
export function MessageListWrapper(props: MessageListWrapperProps) {
    // 添加一个控制台日志，帮助我们调试
    useEffect(() => {
        console.log("MessageListWrapper接收到的消息数量:", props.messages.length);
        if (props.messages.length > 0) {
            console.log("消息示例:", props.messages[0]);
        }
    }, [props.messages]);

    // 将原始格式转换为通用格式
    const adaptedMessages = props.messages.map((msg, index) => ({
        role: msg.role,
        content: msg.content,
        think_content: msg.think_content,
        thinkingTime: msg.thinkingTime,
        web_search_data: msg.web_search_data
    }));

    return (
        <MessageList
            messages={adaptedMessages}
            isLoading={props.isLoading}
            thinkingContent={props.thinkingContent}
            showThinking={props.showThinking}
            thinkingTime={props.thinkingTime}
            isThinkingExpanded={props.isThinkingExpanded}
            webSearchData={props.webSearchData}
            onToggleThinking={props.onToggleThinking}
            onRegenerate={props.onRegenerate}
            messagesEndRef={props.messagesEndRef}
        />
    );
} 