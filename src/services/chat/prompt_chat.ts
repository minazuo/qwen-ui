interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

import { CHAT_API } from '../config/api';

export interface CreatePromptChatParams {
    session_id: string
    title: string
    description: string
    system_prompt?: string
    user_prompt?: string
    deep_thinking_tool?: boolean
    web_search_tool?: boolean
    max_history_length?: number
    max_tokens?: number
    temperature?: number
    response_format?: Record<string, string>
}

export interface CreatePromptChatResponse {
    code: number
    message: string
    prompt_id: string
}

export interface PromptChatItem {
    prompt_id: string
    title: string
    description: string
    deep_thinking_tool?: boolean
    web_search_tool?: boolean
}

export interface GetPromptChatResponse {
    code: number
    message: string
    prompts_data: PromptChatItem[]
}

export interface PromptChatParams {
    prompt_id: string
    session_id: string
    user_message: string
    history: ChatMessage[]
    enable_deep_thinking?: boolean
    web_search?: boolean
}

export interface PromptChatCallbacks {
    onMessage: (message: string) => void
    onThinking?: (message: string) => void
    onWebSearch?: (data: any) => void
    onError: (error: Error) => void
    onComplete: () => void
    signal?: AbortSignal
}

/**
 * 创建提示词聊天
 */
export async function createPromptChat(params: CreatePromptChatParams): Promise<CreatePromptChatResponse> {
    try {
        const response = await fetch(CHAT_API.ENDPOINTS.CREATE_PROMPT_CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('创建提示词聊天失败:', error);
        throw error;
    }
}

/**
 * 获取提示词聊天列表
 */
export async function getPromptChat(): Promise<GetPromptChatResponse> {
    try {
        const response = await fetch(CHAT_API.ENDPOINTS.GET_PROMPT_CHAT, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('获取提示词聊天列表失败:', error);
        throw error;
    }
}

/**
 * 使用提示词聊天发送消息
 */
export async function promptChat(
    params: PromptChatParams,
    callbacks: PromptChatCallbacks
): Promise<void> {
    console.log('开始请求 promptChat:', params);
    console.log('=== 消息流开始时间:', new Date().toISOString(), '===');

    try {
        const response = await fetch(CHAT_API.ENDPOINTS.PROMPT_CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: params.session_id,
                prompt_id: params.prompt_id,
                user_message: params.user_message,
                history: params.history,
                enable_deep_thinking: params.enable_deep_thinking,
                web_search: params.web_search
            }),
            signal: callbacks.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                console.log('流读取完成');
                callbacks.onComplete();
                break;
            }

            try {
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    if (line.startsWith('data: ')) {
                        const dataContent = line.slice(6);
                        try {
                            const parsed = JSON.parse(dataContent);
                            if (parsed.code === 200) {
                                const timestamp = new Date().toISOString();

                                if (parsed.type === 'web_search' && callbacks.onWebSearch && parsed.data) {
                                    console.log(`[${timestamp}] 收到网络检索数据:`, parsed.type, '结果数量:', parsed.data.pages_count);
                                    callbacks.onWebSearch(parsed.data);
                                    console.log(`[${timestamp}] 处理完网络检索数据`);
                                } else if (parsed.type === 'think' && callbacks.onThinking) {
                                    console.log(`[${timestamp}] 收到思考数据:`, parsed.type, '长度:', parsed.answer?.length || 0);
                                    callbacks.onThinking(parsed.answer);
                                } else if (parsed.type === 'answer' && parsed.answer !== undefined) {
                                    console.log(`[${timestamp}] 收到回答数据:`, parsed.type, '内容:', parsed.answer);
                                    callbacks.onMessage(parsed.answer);
                                }
                            }
                        } catch (parseError) {
                            console.error('解析消息失败:', parseError, dataContent);
                        }
                    }
                }
            } catch (error) {
                console.error('处理数据块错误:', error);
                callbacks.onError(error instanceof Error ? error : new Error('处理响应出错'));
                return;
            }
        }
    } catch (error) {
        console.error('请求失败:', error);
        if (error instanceof Error && error.name !== 'AbortError') {
            callbacks.onError(error);
        }
    }

    console.log('=== 消息流结束时间:', new Date().toISOString(), '===');
}
