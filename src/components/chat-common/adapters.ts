import { MessageExtended, SessionItemExtended } from './types'
import { ChatMessage, ChatSession } from '@/store/chat-store'
import { PromptChatItem } from '@/services/chat/prompt_chat'

/**
 * 将ChatMessage转换为统一消息格式
 */
export function adaptChatMessage(message: ChatMessage): MessageExtended {
    return {
        role: message.role,
        content: message.content,
        think_content: message.think_content,
        thinkingTime: message.thinkingTime,
        web_search_data: message.web_search_data
    }
}

/**
 * 将ChatSession转换为统一会话格式
 */
export function adaptChatSession(session: ChatSession): SessionItemExtended {
    return {
        id: session.id,
        title: session.title,
        timestamp: session.timestamp,
        messages: session.messages.map(adaptChatMessage),
        model: session.model,
        enableDeepThinking: session.enableDeepThinking
    }
}

/**
 * 将PromptChatItem转换为可用于侧边栏的格式
 */
export function adaptPromptToSidebar(prompts: PromptChatItem[]): SessionItemExtended[] {
    return prompts.map(prompt => ({
        id: prompt.prompt_id,
        title: prompt.title,
        timestamp: new Date(),
        messages: [],
        // 额外的元数据
        description: prompt.description,
        type: 'prompt' // 标记为prompt类型
    }))
}

/**
 * 通用的消息格式转换
 */
export function adaptMessage(data: any, type: 'chat' | 'prompt'): MessageExtended[] {
    if (type === 'chat') {
        if (Array.isArray(data)) {
            return data.map(adaptChatMessage)
        }
        return []
    } else if (type === 'prompt') {
        // 处理prompt类型消息转换逻辑
        if (Array.isArray(data)) {
            return data.map(promptMsg => ({
                role: promptMsg.role || 'assistant',
                content: promptMsg.content || '',
                // 保留原始数据的其他字段
                ...Object.keys(promptMsg)
                    .filter(key => !['role', 'content'].includes(key))
                    .reduce((obj, key) => ({ ...obj, [key]: promptMsg[key] }), {})
            }))
        }
        return []
    }
    return []
} 