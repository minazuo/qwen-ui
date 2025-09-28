interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

import { CHAT_API } from '../config/api';

export interface WebPage {
    title: string
    url: string
    content: string
}

export interface WebSearchResponse {
    query: string
    pages: WebPage[]
    pages_count: number
    suggestions: string[]
    infoboxes: Array<Record<string, any>>
}

interface RecommendChatParams {
    user_id?: string  // 添加可选的user_id字段
    session_id: string
    message: string
    history: ChatMessage[]
    enable_deep_thinking: boolean
    web_search: boolean
    regenerate_mode?: 'regenerate' | 'continue'  // 重新生成模式
}

export interface RecommendChatCallbacks {
    onMessage: (message: string) => void
    onThinking?: (message: string) => void
    onWebSearch?: (data: WebSearchResponse) => void
    onError: (error: Error) => void
    onComplete: () => void
    signal?: AbortSignal
}

export async function recommendChat(
    params: RecommendChatParams,
    callbacks: RecommendChatCallbacks
) {
    console.log('开始请求 recommendChat:', params)
    console.log('=== 消息流开始时间:', new Date().toISOString(), '===')

    // 添加信号处理变量
    let isAborted = false;
    const { signal } = callbacks;

    // 监听中止信号
    if (signal) {
        // 检查信号是否已经被中止
        if (signal.aborted) {
            console.log('请求已被预先中止')
            callbacks.onComplete();
            return;
        }

        // 添加中止监听器
        const abortListener = () => {
            isAborted = true;
            console.log('请求已被中止');
        };

        signal.addEventListener('abort', abortListener, { once: true });
    }

    try {
        // 参考 lib/api.ts sendChatMessage 方法，使用 FormData 格式
        const formData = new FormData();
        
        // 添加参数（与 lib/api.ts 中的字段名保持一致）
        formData.append('user_id', params.user_id || '123');
        // 确保 session_id 不会回退到默认值
        if (!params.session_id) {
            console.error('错误：session_id 未提供或为空');
            throw new Error('session_id 是必需的参数');
        }
        formData.append('session_id', params.session_id);
        formData.append('prompt', params.message);  // message 映射到 prompt 字段
        formData.append('history', JSON.stringify(params.history));
        formData.append('enable_deep_thinking', params.enable_deep_thinking.toString());
        formData.append('web_search', params.web_search.toString());
        if (params.regenerate_mode) {
            formData.append('regenerate_mode', params.regenerate_mode);
        }

        const response = await fetch(CHAT_API.ENDPOINTS.CHAT, {
            method: 'POST',
            // 移除 Content-Type，让浏览器自动设置
            body: formData,
            signal: callbacks.signal,
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        if (!response.body) {
            throw new Error('Response body is null')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        // 定义一个安全的读取函数
        async function safeRead() {
            try {
                while (true) {
                    // 如果已中止，则停止读取
                    if (isAborted) {
                        console.log('读取过程被中止')
                        break
                    }

                    const { done, value } = await reader.read()

                    if (done) {
                        console.log('流读取完成')
                        callbacks.onComplete()
                        break
                    }

                    try {
                        const chunk = decoder.decode(value, { stream: true })
                        buffer += chunk

                        const lines = buffer.split('\n')
                        buffer = lines.pop() || ''

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i]

                            if (line.startsWith('data: ')) {
                                const dataContent = line.slice(6)
                                try {
                                    const parsed = JSON.parse(dataContent)
                                    if (parsed.code === 200) {
                                        const timestamp = new Date().toISOString();

                                        if (parsed.type === 'web_search' && callbacks.onWebSearch && parsed.data) {
                                            callbacks.onWebSearch(parsed.data as WebSearchResponse)
                                        } else if (parsed.type === 'think' && callbacks.onThinking) {
                                            callbacks.onThinking(parsed.answer)
                                        } else if (parsed.type === 'answer' && parsed.answer !== undefined) {
                                            callbacks.onMessage(parsed.answer)
                                        }
                                    }
                                } catch (parseError) {
                                    console.error('解析消息失败:', parseError, dataContent)
                                }
                            }
                        }
                    } catch (error) {
                        if (isAborted) {
                            console.log('中止时处理块失败，这是预期行为')
                            break
                        }

                        console.error('处理数据块错误:', error)
                        callbacks.onError(error instanceof Error ? error : new Error('处理响应出错'))
                        return
                    }
                }
            } catch (readError) {
                if (isAborted) {
                    console.log('中止时读取失败，这是预期行为')
                    return
                }

                throw readError;
            } finally {
                // 确保读取器被释放
                try {
                    await reader.cancel();
                } catch (cancelError) {
                    console.log('取消读取器时出错:', cancelError);
                }
            }
        }

        await safeRead();
    } catch (error) {
        console.error('请求失败:', error)
        // 只有非AbortError类型的错误才报告给回调
        if (error instanceof Error && error.name !== 'AbortError') {
            callbacks.onError(error)
        } else if (error instanceof Error && error.name === 'AbortError') {
            console.log('请求被中止，这是预期行为')
            // 确保完成回调被调用，以重置状态
            callbacks.onComplete();
        }
    }

    console.log('=== 消息流结束时间:', new Date().toISOString(), '===')
}