import { ReactNode, RefObject } from "react";
import { WebSearchResponse } from "@/services/chat/chat";

// 网络搜索数据中的页面和建议结构
export interface WebSearchPage {
    title: string;
    url: string;
    content: string;
    [key: string]: any;
}

// 增强的 WebSearchData 类型定义
export interface WebSearchData {
    query: string;
    pages_count: number;
    pages: WebSearchPage[];
    suggestions: string[];
    [key: string]: any;
}

// 基础消息类型
export interface MessageBase {
    role: 'user' | 'assistant';
    content: string;
}

// 扩展消息类型
export interface MessageExtended extends MessageBase {
    think_content?: string;
    thinkingTime?: number;
    web_search_data?: WebSearchResponse;
    [key: string]: any; // 允许扩展其他字段
}

// 会话项基础接口
export interface SessionItemBase {
    id: string;
    title: string;
    timestamp: Date | string;
}

// 会话项扩展接口
export interface SessionItemExtended extends SessionItemBase {
    messages: MessageExtended[];
    [key: string]: any; // 允许扩展其他字段
}

// 消息气泡属性接口
export interface MessageBubbleProps {
    content: string;
    metadata?: {
        thinking?: string;
        thinkingTime?: number;
        webSearchData?: WebSearchData;
        [key: string]: any;
    };
    isLoading?: boolean;
    actions?: {
        onCopy?: () => void;
        onRegenerate?: (mode: 'regenerate' | 'continue') => void;
        onThumbsUp?: () => void;
        onThumbsDown?: () => void;
        onShare?: () => void;
        [key: string]: any;
    };
}

// 消息列表属性接口
export interface MessageListProps {
    messages: MessageExtended[];
    isLoading?: boolean;
    thinkingContent?: string;
    showThinking?: boolean;
    thinkingTime?: number;
    isThinkingExpanded?: boolean;
    webSearchData?: WebSearchData | null;
    onToggleThinking?: () => void;
    onRegenerate?: (mode: 'regenerate' | 'continue') => void;
    messagesEndRef?: RefObject<HTMLDivElement>;
}

// 侧边栏属性接口
export interface SidebarProps {
    sessions: SessionItemExtended[];
    currentSession: string | null;
    onNewSession: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
    onEditSessionTitle?: (sessionId: string, newTitle: string) => void;
    mobileSidebar?: boolean;
}

// 输入区域属性接口
export interface ChatInputProps {
    onSend: (message: string, enableDeepThinking: boolean, enableWebSearch: boolean, model?: string, files?: File[], imageFiles?: File[]) => void;
    onStop?: () => void;
    isLoading: boolean;
    isStreaming?: boolean;
}

// 适配器接口 - 用于转换不同API数据结构
export interface ChatAdapter<ApiData, UiData> {
    toMessages: (data: ApiData) => MessageExtended[];
    toSessions: (data: ApiData) => SessionItemExtended[];
    fromMessages: (data: MessageExtended[]) => ApiData;
} 