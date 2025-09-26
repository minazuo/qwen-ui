import { WebSearchResponse, WebPage } from './chat';
import { CHAT_API } from '../config/api';

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

interface ChatWithFileParams {
    session_id: string
    message: string
    history: ChatMessage[]
    enable_deep_thinking: boolean
    web_search: boolean
    files?: File[]
    image_files?: File[]
    regenerate_mode?: 'regenerate' | 'continue'
}

export interface ChatWithFileCallbacks {
    onMessage: (message: string) => void
    onThinking?: (message: string) => void
    onWebSearch?: (data: WebSearchResponse) => void
    onError: (error: Error) => void
    onComplete: () => void
    signal?: AbortSignal
}

export async function chatWithFile(
    params: ChatWithFileParams,
    callbacks: ChatWithFileCallbacks
) {
    console.log('开始请求 chatWithFile:', params)
    console.log('=== 消息流开始时间:', new Date().toISOString(), '===')

    try {
        // 创建 FormData 对象
        const formData = new FormData()
        formData.append('session_id', params.session_id)
        formData.append('message', params.message)
        formData.append('history', JSON.stringify(params.history))
        formData.append('enable_deep_thinking', params.enable_deep_thinking.toString())
        formData.append('web_search', params.web_search.toString())

        // 添加文本文件（如果有）
        if (params.files && params.files.length > 0) {
            params.files.forEach(file => {
                formData.append('files', file)
            })
        }

        // 添加图片文件（如果有）
        if (params.image_files && params.image_files.length > 0) {
            params.image_files.forEach(file => {
                formData.append('image_files', file)
            })
        }

        // 如果提供了重新生成模式，添加到请求中
        if (params.regenerate_mode) {
            formData.append('regenerate_mode', params.regenerate_mode)
        }

        const response = await fetch(CHAT_API.ENDPOINTS.CHAT_FILE, {
            method: 'POST',
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

        while (true) {
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
                                    console.log(`[${timestamp}] 收到网络检索数据:`, parsed.type, '结果数量:', parsed.data.pages_count);
                                    callbacks.onWebSearch(parsed.data as WebSearchResponse)
                                    console.log(`[${timestamp}] 处理完网络检索数据`);
                                } else if (parsed.type === 'think' && callbacks.onThinking) {
                                    console.log(`[${timestamp}] 收到思考数据:`, parsed.type, '长度:', parsed.answer?.length || 0);
                                    callbacks.onThinking(parsed.answer)
                                } else if (parsed.type === 'answer' && parsed.answer !== undefined) {
                                    console.log(`[${timestamp}] 收到回答数据:`, parsed.type, '内容:', parsed.answer);
                                    callbacks.onMessage(parsed.answer)
                                }
                            }
                        } catch (parseError) {
                            console.error('解析消息失败:', parseError, dataContent)
                        }
                    }
                }
            } catch (error) {
                console.error('处理数据块错误:', error)
                callbacks.onError(error instanceof Error ? error : new Error('处理响应出错'))
                return
            }
        }
    } catch (error) {
        console.error('请求失败:', error)
        if (error instanceof Error && error.name !== 'AbortError') {
            callbacks.onError(error)
        }
    }

    console.log('=== 消息流结束时间:', new Date().toISOString(), '===')
} 