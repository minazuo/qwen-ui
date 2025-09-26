// API 相关的类型定义
export interface ChatModelInfo {
  reasoning: boolean;
  web_search: boolean;
  model_name: string;
}

export interface CreateNewChatRequest {
  user_id: string;
}

export interface CreateNewChatResponse {
  success: boolean;
  data?: {
    session_id: string;
    conversation_id?: string;
    title?: string;
  };
  error?: string;
}

export interface GetHistoryChatsRequest {
  user_id: string;
}

export interface HistoryChatItem {
  prompt: string;
  user_id: string;
  chatModelInfo: ChatModelInfo;
  created_at: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  session_id: string;
  files_content?: any;
  updated_at: string;
  // 为了兼容性，保留一些可选字段
  chat_id?: string;
  title?: string;
  message_count?: number;
}

export interface GetHistoryChatsResponse {
  success: boolean;
  data?: HistoryChatItem[];
  error?: string;
  detail?: Array<{
    loc: [string, number];
    msg: string;
    type: string;
  }>;
}

export interface ChatRequest {
  files?: File[];
  user_id: string;
  session_id: string;
  prompt: string;
  chatModelInfo: ChatModelInfo;
}

export interface ChatResponse {
  success: boolean;
  data: {
    response: string;
    session_id: string;
  };
  error?: string;
}

// 新建对话接口
export async function createNewChat(request: CreateNewChatRequest): Promise<CreateNewChatResponse> {
  try {
    console.log('创建新对话请求:', request);

    // 尝试 GET 方法，将参数作为查询参数
    const url = new URL('/api/v1/chat/create_new_chat', window.location.origin);
    url.searchParams.append('user_id', request.user_id);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('新建对话响应状态:', response.status);

    if (!response.ok) {
      // 如果 GET 失败，尝试 POST 方法
      console.log('GET 方法失败，尝试 POST 方法');
      return await createNewChatPost(request);
    }

    const data = await response.json();
    console.log('新建对话响应数据:', data);
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Create new chat API error:', error);
    // 如果 GET 方法出错，尝试 POST 方法
    try {
      console.log('GET 方法出错，尝试 POST 方法');
      return await createNewChatPost(request);
    } catch (postError) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建新对话失败'
      };
    }
  }
}

// POST 方法的备用实现
async function createNewChatPost(request: CreateNewChatRequest): Promise<CreateNewChatResponse> {
  try {
    // 尝试使用 FormData 格式（类似聊天接口）
    const formData = new FormData();
    formData.append('user_id', request.user_id);

    const response = await fetch('/api/v1/chat/create_new_chat', {
      method: 'POST',
      body: formData,
    });

    console.log('FormData POST 方法响应状态:', response.status);

    if (!response.ok) {
      // 如果 FormData 也失败，尝试原始 JSON 方法
      const jsonResponse = await fetch('/api/v1/chat/create_new_chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('JSON POST 方法响应状态:', jsonResponse.status);

      if (!jsonResponse.ok) {
        throw new Error(`HTTP error! status: ${jsonResponse.status}`);
      }

      const jsonData = await jsonResponse.json();
      console.log('JSON POST 方法响应数据:', jsonData);
      
      return {
        success: true,
        data: jsonData
      };
    }

    const data = await response.json();
    console.log('FormData POST 方法响应数据:', data);
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    throw error;
  }
}

// 流式响应回调类型
export type StreamCallback = (chunk: string, isComplete: boolean) => void;

// 流式API调用函数
export async function sendChatMessageStream(
  request: ChatRequest,
  onChunk: StreamCallback
): Promise<void> {
  try {
    const formData = new FormData();
    
    // 添加文件（如果有）
    if (request.files && request.files.length > 0) {
      request.files.forEach((file) => {
        formData.append('files', file);
      });
    }
    
    // 添加其他参数
    formData.append('user_id', request.user_id);
    formData.append('session_id', request.session_id);
    formData.append('prompt', request.prompt);
    formData.append('chatModelInfo', JSON.stringify(request.chatModelInfo));

    console.log('发送请求:', request);

    const response = await fetch('/api/v1/chat/base_chat', {
      method: 'POST',
      body: formData,
    });

    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 检查是否是流式响应
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
      // 处理流式响应
      console.log('检测到流式响应');
      await handleSSEStream(response, onChunk);
    } else {
      // 尝试处理为流式响应，即使Content-Type不匹配
      console.log('尝试作为流式响应处理');
      await handleSSEStream(response, onChunk);
    }
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error(error instanceof Error ? error.message : '发送消息失败');
  }
}

// 处理Server-Sent Events流
async function handleSSEStream(response: Response, onChunk: StreamCallback): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('流读取完成');
        onChunk('', true);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      console.log('接收到数据:', buffer);
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '') continue;
        
        console.log('处理行:', trimmedLine);
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6); // 移除 'data: ' 前缀
          
          if (data === '[DONE]') {
            console.log('收到结束标记');
            onChunk('', true);
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            console.log('解析JSON:', parsed);
            
            // 根据新的数据结构提取answer字段
            if (parsed.code === 200 && parsed.type === 'answer' && parsed.answer) {
              console.log('提取到answer:', parsed.answer);
              onChunk(parsed.answer, false);
            } else if (parsed.answer) {
              // 兼容处理，直接有answer字段
              console.log('直接提取answer:', parsed.answer);
              onChunk(parsed.answer, false);
            }
          } catch (e) {
            console.log('JSON解析失败，尝试作为纯文本处理:', data);
            // 如果不是JSON格式，尝试直接解析
            try {
              // 尝试解析可能的JSON字符串
              const jsonMatch = data.match(/\{.*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.answer) {
                  onChunk(parsed.answer, false);
                  continue;
                }
              }
            } catch (e2) {
              // 忽略解析错误
            }
            
            // 最后尝试作为纯文本
            if (data.trim()) {
              onChunk(data, false);
            }
          }
        } else if (trimmedLine.startsWith('event: ')) {
          // 处理事件类型
          console.log('事件类型:', trimmedLine.slice(7));
          continue;
        } else {
          // 可能是纯文本流或其他格式
          console.log('纯文本数据:', trimmedLine);
          try {
            // 尝试解析可能的JSON
            const parsed = JSON.parse(trimmedLine);
            if (parsed.answer) {
              onChunk(parsed.answer, false);
            }
          } catch (e) {
            // 作为纯文本处理
            if (trimmedLine) {
              onChunk(trimmedLine, false);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// 生成唯一的会话ID
export function generateSessionId(userId: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `user_${userId}_session_${timestamp}_${randomStr}`;
}

// 默认的聊天模型配置
export const defaultChatModelInfo: ChatModelInfo = {
  reasoning: false,
  web_search: false,
  model_name: "gpt-4o-mini"
};

// 保留原有的非流式API函数作为备用
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    const formData = new FormData();
    
    // 添加文件（如果有）
    if (request.files && request.files.length > 0) {
      request.files.forEach((file) => {
        formData.append('files', file);
      });
    }
    
    // 添加其他参数
    formData.append('user_id', request.user_id);
    formData.append('session_id', request.session_id);
    formData.append('prompt', request.prompt);
    formData.append('chatModelInfo', JSON.stringify(request.chatModelInfo));

    const response = await fetch('/api/v1/chat/base_chat', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chat API error:', error);
    return {
      success: false,
      data: {
        response: '',
        session_id: request.session_id
      },
      error: error instanceof Error ? error.message : '发送消息失败'
    };
  }
}

// 获取历史对话接口
export async function getHistoryChats(request: GetHistoryChatsRequest): Promise<GetHistoryChatsResponse> {
  try {
    console.log('获取历史对话请求:', request);

    // 使用 GET 方法，将参数作为查询参数（参考 createNewChat 的实现）
    const url = new URL('/api/v1/chat/get_history_chats', window.location.origin);
    url.searchParams.append('user_id', request.user_id);

    const response = await fetch(url.toString(), {
      method: 'GET',
      // 移除 Content-Type 头部，因为 GET 请求通常不需要
    });

    console.log('获取历史对话响应状态:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('获取历史对话响应数据:', data);
    
    // 检查是否返回错误详情
    if (data.detail && Array.isArray(data.detail)) {
      return {
        success: false,
        error: '获取历史对话失败',
        detail: data.detail
      };
    }
    
    return {
      success: true,
      data: Array.isArray(data) ? data : (data.data || [])
    };
  } catch (error) {
    console.error('Get history chats API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取历史对话失败'
    };
  }
}