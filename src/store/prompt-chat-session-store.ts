import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { WebSearchResponse } from '@/services/chat/chat'

// 消息和会话的类型定义
export interface PromptChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    think_content?: string
    thinkingTime?: number
    web_search_data?: WebSearchResponse
}

export interface PromptChatSession {
    id: string
    promptId: string
    title: string
    messages: PromptChatMessage[]
    timestamp: Date
}

// 按时间分组的会话
export interface GroupedSessions {
    today: PromptChatSession[]
    thisWeek: PromptChatSession[]
    thisMonth: PromptChatSession[]
    older: PromptChatSession[]
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

// 按更新时间排序（最新的在前面），但仅用于初始排序，不会在选择会话时改变
const sortByUpdatedAt = (a: PromptChatSession, b: PromptChatSession) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

// 按ID排序，用于确保排序稳定性
const sortById = (a: PromptChatSession, b: PromptChatSession) =>
    a.id.localeCompare(b.id);

// 稳定的排序函数，首先按时间戳排序，然后按ID排序
const stableSortSessions = (a: PromptChatSession, b: PromptChatSession) => {
    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    // 如果时间戳相同，按ID排序以保持稳定
    return timeDiff === 0 ? sortById(a, b) : timeDiff;
};

// 按时间分组会话
export function groupSessionsByTime(sessions: PromptChatSession[]): GroupedSessions {
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

    // 使用稳定排序
    result.today.sort(stableSortSessions)
    result.thisWeek.sort(stableSortSessions)
    result.thisMonth.sort(stableSortSessions)
    result.older.sort(stableSortSessions)

    return result
}

// 创建新会话
function createSession(promptId: string, title: string): PromptChatSession {
    return {
        id: uuidv4(),
        promptId,
        title,
        messages: [],
        timestamp: new Date()
    }
}

// Zustand存储状态接口
interface PromptChatSessionState {
    sessions: PromptChatSession[]
    currentSession: string | null
    currentPromptId: string | null
    streamingSession: string | null
    isLoading: boolean
    messages: PromptChatMessage[]
    thinking: {
        content: string
        time: number
        show: boolean
        isExpanded: boolean
        isComplete: boolean
    }
    // Actions
    createNewSession: (promptId: string, title: string) => string
    setCurrentSession: (sessionId: string | null) => void
    setCurrentPromptId: (promptId: string | null) => void
    addMessage: (message: Omit<PromptChatMessage, 'id' | 'timestamp'>, sessionId?: string) => void
    updateAssistantMessage: (content: string, thinkContent?: string, sessionId?: string, webSearchData?: WebSearchResponse) => void
    updateThinking: (update: Partial<PromptChatSessionState['thinking']>) => void
    deleteSession: (sessionId: string) => void
    clearSessions: () => void
    setStreamingSession: (sessionId: string | null) => void
    replaceLastAssistantMessage: (content: string, thinkContent?: string, sessionId?: string, webSearchData?: WebSearchResponse) => void
    updateSessionTitle: (sessionId: string, title: string) => void
}

// 持久化存储的键名
const STORAGE_KEY = 'prompt-chat-session-storage'
const CURRENT_SESSION_KEY = 'prompt-chat-current-session-id'
const CURRENT_PROMPT_ID_KEY = 'prompt-chat-current-prompt-id'

// 创建全局状态管理
export const usePromptChatSessionStore = create<PromptChatSessionState>()(
    persist(
        (set, get) => ({
            sessions: [],
            currentSession: null,
            currentPromptId: null,
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

            createNewSession: (promptId, title) => {
                if (!promptId) {
                    console.error('创建新会话失败: 没有提供promptId');
                    return '';
                }

                const newSession = createSession(promptId, title);
                set({
                    sessions: [newSession, ...get().sessions],
                    currentSession: newSession.id,
                    currentPromptId: promptId
                });

                localStorage.setItem(CURRENT_SESSION_KEY, newSession.id);
                localStorage.setItem(CURRENT_PROMPT_ID_KEY, promptId);

                return newSession.id;
            },

            setCurrentSession: (sessionId) => {
                // 如果没有改变，不做处理
                if (get().currentSession === sessionId) {
                    return;
                }

                // 设置新的当前会话
                set({ currentSession: sessionId });

                // 处理本地存储和会话消息加载
                if (sessionId) {
                    // 保存到本地存储
                    localStorage.setItem(CURRENT_SESSION_KEY, sessionId);

                    // 查找会话
                    const session = get().sessions.find(s => s.id === sessionId);
                    if (session) {
                        // 设置会话相关状态，不更新会话标题
                        set({
                            // 更新消息列表
                            messages: session.messages,
                            // 更新当前提示词ID，但不修改会话标题
                            currentPromptId: session.promptId,
                            // 重置思考状态
                            thinking: {
                                content: '',
                                time: 0,
                                show: false,
                                isExpanded: true,
                                isComplete: false
                            }
                        });

                        // 保存当前提示词ID到本地存储
                        localStorage.setItem(CURRENT_PROMPT_ID_KEY, session.promptId);

                        console.log(`已切换到会话: ${sessionId}, 标题: ${session.title}, 保留原标题`);
                    } else {
                        console.error(`未找到指定会话: ${sessionId}`);
                    }
                } else {
                    // 如果sessionId为null，清除相关数据
                    localStorage.removeItem(CURRENT_SESSION_KEY);
                    set({
                        messages: [],
                        thinking: {
                            content: '',
                            time: 0,
                            show: false,
                            isExpanded: true,
                            isComplete: false
                        }
                    });
                }
            },

            setCurrentPromptId: (promptId) => {
                set({ currentPromptId: promptId });
                if (promptId) {
                    localStorage.setItem(CURRENT_PROMPT_ID_KEY, promptId);
                } else {
                    localStorage.removeItem(CURRENT_PROMPT_ID_KEY);
                }
            },

            addMessage: (message, sessionId) => {
                const { currentSession, sessions, streamingSession, currentPromptId } = get();
                // 使用 sessionId 如果提供了，否则使用 currentSession
                // 这里将 string | null | undefined 类型转换为 string | null
                const targetSessionId = sessionId !== undefined ? sessionId : currentSession;

                // 如果指定了会话ID，但与当前流式会话不符，则忽略
                if (streamingSession && sessionId && streamingSession !== sessionId) {
                    return;
                }

                // 创建完整消息对象
                const fullMessage: PromptChatMessage = {
                    id: uuidv4(),
                    ...message,
                    timestamp: new Date()
                };

                let updatedSessions = [...sessions];

                if (!targetSessionId || !currentPromptId) {
                    console.error('添加消息失败: 没有当前会话或提示词ID');
                    return;
                }

                // 更新现有会话
                const sessionIndex = sessions.findIndex(s => s.id === targetSessionId);
                if (sessionIndex !== -1) {
                    const updatedSession = {
                        ...sessions[sessionIndex],
                        messages: [...sessions[sessionIndex].messages, fullMessage],
                        timestamp: new Date()
                    };
                    updatedSessions[sessionIndex] = updatedSession;

                    set({
                        sessions: updatedSessions,
                        ...(targetSessionId === currentSession && {
                            messages: updatedSession.messages
                        })
                    });
                } else {
                    // 如果会话不存在但有ID，创建新会话
                    const title = '提示词对话';
                    const newSession = {
                        ...createSession(currentPromptId, title),
                        id: targetSessionId,
                        messages: [fullMessage],
                    };
                    updatedSessions = [newSession, ...sessions];
                    set({
                        sessions: updatedSessions,
                        currentSession: targetSessionId,
                        messages: [fullMessage]
                    });
                    localStorage.setItem(CURRENT_SESSION_KEY, targetSessionId);
                }
            },

            updateAssistantMessage: (content, thinkContent, sessionId, webSearchData) => {
                const { currentSession, sessions, streamingSession } = get();
                const targetSessionId = sessionId || currentSession;

                // 如果指定了会话ID，但与当前流式会话不符，则忽略
                if (streamingSession && sessionId && streamingSession !== sessionId) {
                    return;
                }

                if (!targetSessionId) return;

                // 查找目标会话
                const sessionIndex = sessions.findIndex(s => s.id === targetSessionId);
                if (sessionIndex === -1) return;

                const session = sessions[sessionIndex];
                const sessionMessages = [...session.messages];
                const lastMessage = sessionMessages[sessionMessages.length - 1];

                if (lastMessage?.role !== 'assistant') return;

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
                };
                sessionMessages[sessionMessages.length - 1] = updatedMessage;

                // 更新会话
                const updatedSessions = [...sessions];
                updatedSessions[sessionIndex] = {
                    ...session,
                    messages: sessionMessages,
                    timestamp: new Date()
                };

                set({
                    sessions: updatedSessions,
                    ...(targetSessionId === currentSession && {
                        messages: sessionMessages
                    })
                });
            },

            updateThinking: (update) => {
                set(state => ({
                    thinking: {
                        ...state.thinking,
                        ...update
                    }
                }));
            },

            deleteSession: (sessionId) => {
                const { sessions, currentSession } = get();

                // 删除会话时不改变其他会话的时间戳，保持顺序稳定
                const updatedSessions = sessions.filter(s => s.id !== sessionId);
                set({ sessions: updatedSessions });

                if (currentSession === sessionId) {
                    // 如果删除的是当前会话，找一个新的会话作为当前会话
                    // 按时间戳排序，选择最新的会话
                    const sortedSessions = [...updatedSessions].sort(stableSortSessions);

                    if (sortedSessions.length > 0) {
                        // 如果还有其他会话，选择最新的一个
                        const newCurrentSession = sortedSessions[0];
                        set({
                            currentSession: newCurrentSession.id,
                            messages: newCurrentSession.messages,
                            currentPromptId: newCurrentSession.promptId,
                            thinking: {
                                content: '',
                                time: 0,
                                show: false,
                                isExpanded: true,
                                isComplete: false
                            }
                        });
                        localStorage.setItem(CURRENT_SESSION_KEY, newCurrentSession.id);
                        localStorage.setItem(CURRENT_PROMPT_ID_KEY, newCurrentSession.promptId);
                    } else {
                        // 如果没有其他会话了，清除当前会话
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
                        });
                        localStorage.removeItem(CURRENT_SESSION_KEY);
                    }
                }
            },

            clearSessions: () => {
                set({
                    sessions: [],
                    currentSession: null,
                    currentPromptId: null,
                    messages: [],
                    thinking: {
                        content: '',
                        time: 0,
                        show: false,
                        isExpanded: true,
                        isComplete: false
                    }
                });
                localStorage.removeItem(CURRENT_SESSION_KEY);
                localStorage.removeItem(CURRENT_PROMPT_ID_KEY);
            },

            setStreamingSession: (sessionId) => {
                set({ streamingSession: sessionId, isLoading: !!sessionId });
            },

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
                } catch (error) {
                    console.error('替换AI消息失败:', error);
                }
            },

            updateSessionTitle: (sessionId, title) => {
                if (!sessionId || !title.trim()) return;

                const { sessions } = get();
                const sessionIndex = sessions.findIndex(s => s.id === sessionId);

                if (sessionIndex === -1) {
                    console.error(`未找到要更新标题的会话: ${sessionId}`);
                    return;
                }

                // 创建更新后的会话数组，仅更新标题，不更新时间戳
                const updatedSessions = [...sessions];
                updatedSessions[sessionIndex] = {
                    ...updatedSessions[sessionIndex],
                    title: title.trim()
                    // 删除时间戳更新，保持原始时间戳
                };

                // 更新状态
                set({ sessions: updatedSessions });

                console.log(`会话 ${sessionId} 标题已更新为: ${title}, 保持原时间戳`);
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
                }),
                currentPromptId: state.currentPromptId
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // 获取当前会话ID和提示词ID
                    const currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
                    const currentPromptId = localStorage.getItem(CURRENT_PROMPT_ID_KEY);

                    // 设置当前提示词ID
                    if (currentPromptId) {
                        state.currentPromptId = currentPromptId;
                    }

                    // 只有当前有会话ID时才加载会话
                    if (currentSessionId) {
                        const currentSession = state.sessions.find((s: PromptChatSession) => s.id === currentSessionId);
                        if (currentSession) {
                            state.currentSession = currentSessionId;
                            state.messages = currentSession.messages;
                            // 设置思考状态
                            state.thinking = {
                                ...state.thinking,
                                show: currentSession.messages.some(m => m.think_content)
                            };
                        } else {
                            // 如果找不到会话，不要设置currentSession
                            state.currentSession = null;
                            state.messages = [];
                        }
                    } else {
                        // 打开首页时不加载任何会话
                        state.currentSession = null;
                        state.messages = [];
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
); 