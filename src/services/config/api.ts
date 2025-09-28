/**
 * API配置文件
 */

// API基础URL
export const API_BASE_URL = 'api/v1';

// 聊天相关API
export const CHAT_API = {
    BASE_URL: `${API_BASE_URL}/chat`,
    ENDPOINTS: {
        CHAT: `${API_BASE_URL}/chat/base_chat`,
        CREATE_NEW_CHAT: `${API_BASE_URL}/chat/create_new_chat`,
        HISTORY_CHAT: `${API_BASE_URL}/chat/get_history_chats`,
        CHAT_FILE: `${API_BASE_URL}/chat/base_chat`,
        CREATE_PROMPT_CHAT: `${API_BASE_URL}/chat/create_prompt_chat`,
        GET_PROMPT_CHAT: `${API_BASE_URL}/chat/get_prompt_chat`,
        PROMPT_CHAT: `${API_BASE_URL}/chat/prompt_chat`
    }
}; 