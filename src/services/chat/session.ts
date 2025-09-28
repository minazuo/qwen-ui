/**
 * 会话管理API服务
 */

import { CHAT_API } from '../config/api';

// 创建新会话的请求参数
export interface CreateNewChatRequest {
    user_id: string;
}

// 创建新会话的响应数据
export interface CreateNewChatResponse {
    success: boolean;
    data?: {
        prompt?: string | null;
        user_id: string;
        chatModelInfo?: any | null;
        created_at: string;
        messages?: any[] | null;
        session_id: string;
        files_content?: any | null;
        updated_at: string;
    };
    error?: string;
}

// 获取历史会话的请求参数
export interface GetHistoryChatsRequest {
    user_id: string;
}

// 历史会话条目
export interface HistoryChatItem {
    prompt?: string | null;
    user_id: string;
    chatModelInfo?: any | null;
    created_at: string;
    messages?: Array<{
        role: string;
        content: string;
    }> | null;
    session_id: string;
    files_content?: any | null;
    updated_at: string;
    // 兼容性字段
    title?: string;
    chat_id?: string;
}

// 获取历史会话的响应数据
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

/**
 * 创建新会话
 */
export async function createNewChat(request: CreateNewChatRequest): Promise<CreateNewChatResponse> {
    try {
        console.log('创建新会话请求:', request);

        // 使用GET方法，将参数作为查询参数
        const url = new URL(CHAT_API.ENDPOINTS.CREATE_NEW_CHAT, window.location.origin);
        url.searchParams.append('user_id', request.user_id);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('创建新会话响应状态:', response.status);

        if (!response.ok) {
            // 如果GET失败，尝试POST方法
            console.log('GET方法失败，尝试POST方法');
            return await createNewChatPost(request);
        }

        const data = await response.json();
        console.log('创建新会话响应数据:', data);
        
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('创建新会话API错误:', error);
        // 如果GET方法出错，尝试POST方法
        try {
            console.log('GET方法出错，尝试POST方法');
            return await createNewChatPost(request);
        } catch (postError) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '创建新会话失败'
            };
        }
    }
}

/**
 * POST方法的备用实现
 */
async function createNewChatPost(request: CreateNewChatRequest): Promise<CreateNewChatResponse> {
    try {
        // 使用FormData格式
        const formData = new FormData();
        formData.append('user_id', request.user_id);

        const response = await fetch(CHAT_API.ENDPOINTS.CREATE_NEW_CHAT, {
            method: 'POST',
            body: formData,
        });

        console.log('FormData POST方法响应状态:', response.status);

        if (!response.ok) {
            // 如果FormData也失败，尝试JSON方法
            const jsonResponse = await fetch(CHAT_API.ENDPOINTS.CREATE_NEW_CHAT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            console.log('JSON POST方法响应状态:', jsonResponse.status);

            if (!jsonResponse.ok) {
                throw new Error(`HTTP error! status: ${jsonResponse.status}`);
            }

            const jsonData = await jsonResponse.json();
            console.log('JSON POST方法响应数据:', jsonData);
            
            return {
                success: true,
                data: jsonData
            };
        }

        const data = await response.json();
        console.log('FormData POST方法响应数据:', data);
        
        return {
            success: true,
            data: data
        };
    } catch (error) {
        throw error;
    }
}

/**
 * 获取历史会话
 */
export async function getHistoryChats(request: GetHistoryChatsRequest): Promise<GetHistoryChatsResponse> {
    try {
        console.log('获取历史会话请求:', request);

        // 使用GET方法，将参数作为查询参数
        const url = new URL(CHAT_API.ENDPOINTS.HISTORY_CHAT, window.location.origin);
        url.searchParams.append('user_id', request.user_id);

        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        console.log('获取历史会话响应状态:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('获取历史会话响应数据:', data);
        
        // 检查是否返回错误详情
        if (data.detail && Array.isArray(data.detail)) {
            return {
                success: false,
                error: '获取历史会话失败',
                detail: data.detail
            };
        }
        
        return {
            success: true,
            data: Array.isArray(data) ? data : (data.data || [])
        };
    } catch (error) {
        console.error('获取历史会话API错误:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '获取历史会话失败'
        };
    }
}