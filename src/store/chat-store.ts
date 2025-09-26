import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useUserStore, ModelType } from './user'
import { WebSearchResponse } from '@/services/chat/chat'

// 消息和会话的类型定义
export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    think_content?: string // 思考内容，仅在assistant消息中有效
    thinkingTime?: number  // 思考用时（整数秒）
    web_search_data?: WebSearchResponse
}

export interface ChatSession {
    id: string
    title: string
    messages: ChatMessage[]
    timestamp: Date
    model?: 'QWEN' | 'DEEPSEEK'
    enableDeepThinking?: boolean
}

// 按时间分组的会话
export interface GroupedSessions {
    today: ChatSession[]
    thisWeek: ChatSession[]
    thisMonth: ChatSession[]
    older: ChatSession[]
}

// 格式化日期
export function formatDate(date: Date | string | number | null | undefined): string {
    if (!date) return '未知时间';

    try {
        const dateObj = date instanceof Date ? date : new Date(date);

        // 检查日期是否有效
        if (isNaN(dateObj.getTime())) {
            return '未知时间';
        }

        if (isToday(dateObj)) {
            return format(dateObj, 'HH:mm', { locale: zhCN });
        } else if (isThisWeek(dateObj)) {
            return format(dateObj, 'EEEE', { locale: zhCN });
        } else {
            return format(dateObj, 'MM-dd', { locale: zhCN });
        }
    } catch (error) {
        console.error('日期格式化错误:', error);
        return '未知时间';
    }
}

// 按时间分组会话
export function groupSessionsByTime(sessions: ChatSession[]): GroupedSessions {
    const result: GroupedSessions = {
        today: [],
        thisWeek: [],
        thisMonth: [],
        older: []
    }

    sessions.forEach(session => {
        const date = new Date(session.timestamp)

        if (isToday(date)) {
            result.today.push(session)
        } else if (isThisWeek(date)) {
            result.thisWeek.push(session)
        } else if (isThisMonth(date)) {
            result.thisMonth.push(session)
        } else {
            result.older.push(session)
        }
    })

    // 按更新时间排序（最新的在前面）
    const sortByUpdatedAt = (a: ChatSession, b: ChatSession) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()

    result.today.sort(sortByUpdatedAt)
    result.thisWeek.sort(sortByUpdatedAt)
    result.thisMonth.sort(sortByUpdatedAt)
    result.older.sort(sortByUpdatedAt)

    return result
}

// 为用户消息生成标题
function generateSessionTitle(message: string): string {
    // 去除空格和标点符号后，截取前20个字符作为标题
    const title = message
        .trim()
        .replace(/[^\p{L}\p{N}]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    return title.length > 20 ? title.substring(0, 20) + '...' : title
}

// 创建新会话
function createSession(title: string = '新对话'): ChatSession {
    // 从用户设置中获取深度思考模式和模型设置
    const userSettings = useUserStore.getState()

    return {
        id: uuidv4(),
        title: title,
        messages: [],
        timestamp: new Date(),
        model: userSettings.selectedModel as 'QWEN' | 'DEEPSEEK',
        enableDeepThinking: userSettings.enableDeepThinking
    }
}

// Zustand存储状态接口
interface ChatState {
    sessions: ChatSession[]
    currentSession: string | null
    streamingSession: string | null
    isLoading: boolean
    messages: ChatMessage[]
    thinking: {
        content: string
        time: number
        show: boolean
        isExpanded: boolean
        isComplete: boolean
    }
    // Actions
    createNewSession: () => string
    setCurrentSession: (sessionId: string | null) => void
    addMessage: (message: ChatMessage, sessionId?: string) => void
    updateAssistantMessage: (content: string, thinkContent?: string, sessionId?: string, webSearchData?: WebSearchResponse) => void
    updateThinking: (update: Partial<ChatState['thinking']>) => void
    deleteSession: (sessionId: string) => void
    selectSession: (sessionId: string) => void
    clearSessions: () => void
    importSessions: (sessions: ChatSession[]) => void
    exportSessions: () => string
    setStreamingSession: (sessionId: string | null) => void
    setThinkModel: (enable: boolean, sessionId: string) => void
    updateSessionModel: (model: 'QWEN' | 'DEEPSEEK', sessionId: string) => void
    updateSessionTitle: (sessionId: string, title: string) => void
    // 添加替换最后一条AI消息的功能
    replaceLastAssistantMessage: (content: string, thinkContent?: string, sessionId?: string, webSearchData?: WebSearchResponse) => void
}

// 持久化存储的键名
const STORAGE_KEY = 'chat-storage'
const CURRENT_SESSION_KEY = 'current-session-id'

// 创建全局状态管理
export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            sessions: [],
            currentSession: null,
            streamingSession: null,
            isLoading: false,
            messages: [],
            thinking: {
                content: '',
                time: 0,
                show: false,
                isExpanded: true,
                isComplete: false
            },

            createNewSession: () => {
                const newSession = createSession()
                set({ sessions: [newSession, ...get().sessions], currentSession: newSession.id })
                localStorage.removeItem(CURRENT_SESSION_KEY)
                return newSession.id
            },

            setCurrentSession: (sessionId) => {
                set({ currentSession: sessionId })
                if (sessionId) {
                    localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
                    // 加载会话消息
                    const session = get().sessions.find(s => s.id === sessionId)
                    if (session) {
                        set({ messages: session.messages })
                    }
                } else {
                    localStorage.removeItem(CURRENT_SESSION_KEY)
                }
            },

            addMessage: (message, sessionId) => {
                const { currentSession, sessions, streamingSession } = get()
                const targetSessionId = sessionId || currentSession

                // 如果指定了会话ID，但与当前流式会话不符，则忽略
                if (streamingSession && sessionId && streamingSession !== sessionId) {
                    return
                }

                let updatedSessions = [...sessions]
                const userSettings = useUserStore.getState()

                if (!targetSessionId) {
                    // 新会话 - 只有在添加消息时才创建会话ID
                    const newSession = createSession()
                    // 直接使用用户全局设置的深度思考模式
                    const think_model = userSettings.enableDeepThinking

                    const sessionWithMessage = {
                        ...newSession,
                        messages: [message],
                        title: message.role === 'user' ? generateSessionTitle(message.content) : '新对话',
                        timestamp: new Date(),
                        think_model,
                        model: userSettings.selectedModel as 'QWEN' | 'DEEPSEEK',
                        enableDeepThinking: userSettings.enableDeepThinking
                    }
                    updatedSessions = [sessionWithMessage, ...sessions]
                    set({
                        currentSession: newSession.id,
                        sessions: updatedSessions,
                        messages: [message]
                    })
                    localStorage.setItem(CURRENT_SESSION_KEY, newSession.id)
                } else {
                    // 更新现有会话
                    const sessionIndex = sessions.findIndex(s => s.id === targetSessionId)
                    if (sessionIndex !== -1) {
                        // 更新会话标题（如果是用户消息且当前会话只有这一条消息）
                        const isFirstUserMessage = message.role === 'user' &&
                            sessions[sessionIndex].messages.length === 0;

                        // 保留当前会话的think_model设置
                        const updatedSession = {
                            ...sessions[sessionIndex],
                            messages: [...sessions[sessionIndex].messages, message],
                            // 如果是第一条用户消息，生成标题
                            ...(isFirstUserMessage && { title: generateSessionTitle(message.content) }),
                            timestamp: new Date(),
                            // 如果用户的深度思考模式和会话不同，优先使用用户设置
                            ...(message.role === 'user' && {
                                think_model: userSettings.enableDeepThinking
                            }),
                            // 如果用户的模型选择和会话不同，优先使用用户设置
                            model: userSettings.selectedModel as 'QWEN' | 'DEEPSEEK',
                            enableDeepThinking: userSettings.enableDeepThinking
                        }
                        updatedSessions[sessionIndex] = updatedSession

                        set({
                            sessions: updatedSessions,
                            ...(targetSessionId === currentSession && {
                                messages: updatedSession.messages
                            })
                        })
                    } else {
                        // 如果会话不存在，创建新会话
                        const think_model = userSettings.enableDeepThinking // 使用用户全局设置
                        const newSession = {
                            ...createSession(),
                            id: targetSessionId,
                            messages: [message],
                            title: message.role === 'user' ? generateSessionTitle(message.content) : '新对话',
                            timestamp: new Date(),
                            think_model,
                            model: userSettings.selectedModel as 'QWEN' | 'DEEPSEEK',
                            enableDeepThinking: userSettings.enableDeepThinking
                        }
                        updatedSessions = [newSession, ...sessions]
                        set({
                            sessions: updatedSessions,
                            currentSession: targetSessionId,
                            messages: [message]
                        })
                        localStorage.setItem(CURRENT_SESSION_KEY, targetSessionId)
                    }
                }
            },

            updateAssistantMessage: (content, thinkContent, sessionId, webSearchData) => {
                const { currentSession, sessions, streamingSession } = get()
                const targetSessionId = sessionId || currentSession

                // 如果指定了会话ID，但与当前流式会话不符，则忽略
                if (streamingSession && sessionId && streamingSession !== sessionId) {
                    return
                }

                if (!targetSessionId) return

                // 查找目标会话
                const sessionIndex = sessions.findIndex(s => s.id === targetSessionId)
                if (sessionIndex === -1) return

                const session = sessions[sessionIndex]
                const sessionMessages = [...session.messages]
                const lastMessage = sessionMessages[sessionMessages.length - 1]

                if (lastMessage?.role !== 'assistant') return

                // 更新消息
                const updatedMessage = {
                    ...lastMessage,
                    content,
                    // 如果提供了思考内容则更新，否则保留现有思考内容
                    ...(thinkContent !== undefined && {
                        think_content: thinkContent,
                        thinkingTime: get().thinking.time
                    }),
                    ...(webSearchData && { web_search_data: webSearchData })
                }
                sessionMessages[sessionMessages.length - 1] = updatedMessage

                // 更新会话
                const updatedSessions = [...sessions]
                updatedSessions[sessionIndex] = {
                    ...session,
                    messages: sessionMessages,
                    timestamp: new Date(),
                    // 不再根据thinking状态修改会话的think_model
                }

                set({
                    sessions: updatedSessions
                })
            },

            updateThinking: (update) => {
                set(state => ({
                    thinking: {
                        ...state.thinking,
                        ...update
                    }
                }))

                // 不再自动更新会话的think_model
            },

            setThinkModel: (enable, sessionId) => {
                const { sessions, currentSession } = get()
                const targetSessionId = sessionId || currentSession

                if (!targetSessionId) return

                // 查找目标会话
                const sessionIndex = sessions.findIndex(s => s.id === targetSessionId)
                if (sessionIndex === -1) return

                // 更新会话的think_model
                const updatedSessions = [...sessions]
                updatedSessions[sessionIndex] = {
                    ...sessions[sessionIndex],
                    enableDeepThinking: enable
                }

                set({ sessions: updatedSessions })
            },

            updateSessionModel: (model, sessionId) => {
                const { sessions, currentSession } = get()
                const targetSessionId = sessionId || currentSession

                if (!targetSessionId) return

                // 查找目标会话
                const sessionIndex = sessions.findIndex(s => s.id === targetSessionId)
                if (sessionIndex === -1) return

                // 更新会话的model
                const updatedSessions = [...sessions]
                updatedSessions[sessionIndex] = {
                    ...sessions[sessionIndex],
                    model: model as 'QWEN' | 'DEEPSEEK'
                }

                set({ sessions: updatedSessions })
            },

            deleteSession: (sessionId) => {
                const { sessions, currentSession } = get()
                const updatedSessions = sessions.filter(s => s.id !== sessionId)
                set({ sessions: updatedSessions })

                if (currentSession === sessionId) {
                    // 删除当前会话后，清空当前状态（相当于新建会话）
                    // 获取用户设置以决定思考模式
                    const userSettings = useUserStore.getState()

                    set({
                        currentSession: null,
                        messages: [],
                        thinking: {
                            content: '',
                            time: 0,
                            show: false,
                            isExpanded: true,
                            isComplete: false
                        }
                    })
                    localStorage.removeItem(CURRENT_SESSION_KEY)
                }
            },

            selectSession: (sessionId) => {
                const { sessions, streamingSession } = get()

                // 如果正在流式输出，不允许切换到其他会话
                if (streamingSession && streamingSession !== sessionId) {
                    console.log('正在输出中，无法切换会话')
                    return
                }

                const session = sessions.find(s => s.id === sessionId)
                if (session) {
                    // 移除同步会话设置到全局用户设置的代码
                    // 不再同步深度思考模式到用户设置
                    // 不再同步模型选择到用户设置

                    set({
                        currentSession: sessionId,
                        messages: session.messages,
                        thinking: {
                            content: '',
                            time: 0,
                            show: session.enableDeepThinking ?? false,
                            isExpanded: true,
                            isComplete: false
                        }
                    })
                    localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
                }
            },

            clearSessions: () => {
                // 获取用户设置
                const userSettings = useUserStore.getState()

                set({
                    sessions: [],
                    currentSession: null,
                    messages: [],
                    thinking: {
                        content: '',
                        time: 0,
                        show: false,
                        isExpanded: true,
                        isComplete: false
                    }
                })
                localStorage.removeItem(CURRENT_SESSION_KEY)
            },

            importSessions: (sessions) => {
                // 确保导入的会话都有think_model字段和model字段
                const updatedSessions = sessions.map(session => ({
                    ...session,
                    // 如果没有think_model字段，根据消息中是否有think_content来设置
                    enableDeepThinking: session.enableDeepThinking ?? session.messages.some(msg =>
                        msg.role === 'assistant' && !!msg.think_content
                    ),
                    // 保留模型信息
                    model: session.model || useUserStore.getState().selectedModel as 'QWEN' | 'DEEPSEEK'
                }))
                set({ sessions: updatedSessions })
            },

            exportSessions: () => {
                return JSON.stringify(get().sessions)
            },

            setStreamingSession: (sessionId) => {
                set({ streamingSession: sessionId, isLoading: !!sessionId })
            },

            updateSessionTitle: (sessionId, title) => {
                try {
                    if (!sessionId) {
                        console.warn('更新会话标题失败: 未提供sessionId');
                        return;
                    }

                    const { sessions, currentSession } = get();
                    if (!sessions || !Array.isArray(sessions)) {
                        console.warn('更新会话标题失败: sessions不是有效数组');
                        return;
                    }

                    // 简单的静态字符串替换为变量，减少错误发生可能性
                    let formattedTitle = '无标题会话';
                    if (title && typeof title === 'string') {
                        formattedTitle = title.trim();
                        if (formattedTitle === '') {
                            formattedTitle = '无标题会话';
                        }
                    }

                    // 不使用findIndex和复杂的数组操作，直接使用map简单操作
                    const updatedSessions = sessions.map(session => {
                        if (session.id === sessionId) {
                            return {
                                ...session,
                                title: formattedTitle
                            };
                        }
                        return session;
                    });

                    // 一次性设置状态，不做条件判断
                    set({
                        sessions: updatedSessions
                    });

                    console.log(`会话标题已更新为 "${formattedTitle}"`);
                } catch (error) {
                    console.error('更新会话标题失败:', error);
                }
            },

            // 添加替换最后一条AI消息的新方法
            replaceLastAssistantMessage: (content, thinkContent, sessionId, webSearchData) => {
                const { currentSession, sessions } = get();
                const targetSessionId = sessionId || currentSession;

                if (!targetSessionId) return;

                try {
                    // 查找目标会话
                    const sessionIndex = sessions.findIndex(s => s.id === targetSessionId);
                    if (sessionIndex === -1) return;

                    const session = sessions[sessionIndex];
                    const sessionMessages = [...session.messages];

                    // 查找最后一条AI消息的索引
                    let lastAssistantIndex = -1;
                    for (let i = sessionMessages.length - 1; i >= 0; i--) {
                        if (sessionMessages[i].role === 'assistant') {
                            lastAssistantIndex = i;
                            break;
                        }
                    }

                    if (lastAssistantIndex === -1) return; // 没有找到AI消息

                    // 更新最后一条AI消息
                    const updatedMessage = {
                        ...sessionMessages[lastAssistantIndex],
                        content,
                        ...(thinkContent !== undefined && {
                            think_content: thinkContent,
                            thinkingTime: get().thinking.time
                        }),
                        ...(webSearchData && { web_search_data: webSearchData })
                    };

                    // 替换消息
                    sessionMessages[lastAssistantIndex] = updatedMessage;

                    // 更新会话
                    const updatedSessions = [...sessions];
                    updatedSessions[sessionIndex] = {
                        ...session,
                        messages: sessionMessages,
                        timestamp: new Date()
                    };

                    // 更新状态
                    set({
                        sessions: updatedSessions,
                        ...(targetSessionId === currentSession && {
                            messages: sessionMessages
                        })
                    });

                    console.log('AI回答已重新生成并替换');
                } catch (error) {
                    console.error('替换AI消息失败:', error);
                }
            }
        }),
        {
            name: STORAGE_KEY,
            partialize: (state) => ({
                sessions: state.sessions.map(session => {
                    // 安全地处理timestamp
                    let timestampStr;
                    try {
                        if (session.timestamp instanceof Date && !isNaN(session.timestamp.getTime())) {
                            timestampStr = session.timestamp.toISOString();
                        } else {
                            timestampStr = new Date().toISOString();
                        }
                    } catch (error) {
                        console.error('处理timestamp错误:', error);
                        timestampStr = new Date().toISOString();
                    }

                    return {
                        ...session,
                        timestamp: timestampStr
                    };
                })
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // 获取当前会话ID
                    const currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY)

                    // 获取用户设置但不再同步会话设置到用户设置
                    const userSettings = useUserStore.getState()

                    // 只有当前有会话ID时才加载会话
                    if (currentSessionId) {
                        const currentSession = state.sessions.find((s: ChatSession) => s.id === currentSessionId)
                        if (currentSession) {
                            state.currentSession = currentSessionId
                            state.messages = currentSession.messages
                            // 设置思考状态基于会话的think_model
                            state.thinking = {
                                ...state.thinking,
                                show: currentSession.enableDeepThinking ?? false
                            }

                            // 移除同步会话模型设置到用户全局设置
                            // 移除同步深度思考模式到用户全局设置
                        } else {
                            // 如果找不到会话，不要设置currentSession
                            state.currentSession = null
                            state.messages = []
                        }
                    } else {
                        // 打开首页时不加载任何会话
                        state.currentSession = null
                        state.messages = []
                        // 使用用户设置的深度思考模式
                        state.thinking = {
                            ...state.thinking,
                            show: userSettings.enableDeepThinking
                        }
                    }

                    // 将ISO字符串日期转换回Date对象
                    state.sessions = state.sessions.map(session => {
                        // 安全地处理时间戳
                        let safeTimestamp;
                        try {
                            // 确保timestamp是有效的字符串
                            const timestamp = typeof session.timestamp === 'string'
                                ? session.timestamp
                                : new Date().toISOString();
                            safeTimestamp = new Date(timestamp);
                            // 检查是否是有效的日期
                            if (isNaN(safeTimestamp.getTime())) {
                                safeTimestamp = new Date();
                            }
                        } catch (error) {
                            console.error('解析timestamp错误:', error);
                            safeTimestamp = new Date();
                        }

                        // 处理消息中的时间戳
                        const safeMessages = Array.isArray(session.messages)
                            ? session.messages.map(msg => {
                                let msgTimestamp;
                                try {
                                    msgTimestamp = new Date(msg.timestamp);
                                    if (isNaN(msgTimestamp.getTime())) {
                                        msgTimestamp = new Date();
                                    }
                                } catch (error) {
                                    console.error('解析消息timestamp错误:', error);
                                    msgTimestamp = new Date();
                                }
                                return {
                                    ...msg,
                                    timestamp: msgTimestamp
                                };
                            })
                            : [];

                        return {
                            ...session,
                            timestamp: safeTimestamp,
                            messages: safeMessages
                        };
                    });
                }
            }
        }
    )
) 