'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import MessageInput from './MessageInput';
import { sendChatMessageStream, generateSessionId, defaultChatModelInfo, createNewChat, getHistoryChats, type ChatModelInfo, type HistoryChatItem } from '../lib/api';
import { useUserStore } from '@/store/user';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: Date;
  sessionId: string;
  prompt?: string; // 添加 prompt 字段
}

export default function ChatContainer() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatModelInfo, setChatModelInfo] = useState<ChatModelInfo>(defaultChatModelInfo);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // 确保客户端渲染标志
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 检测屏幕尺寸
  useEffect(() => {
    if (!isClient) return; // 只在客户端执行
    
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarVisible(false); // 小屏幕默认隐藏侧边栏
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isClient]);

  // 加载历史对话
  useEffect(() => {
    const loadHistoryChats = async () => {
      try {
        setIsLoadingHistory(true);
        console.log('开始加载历史对话...');
        
        const response = await getHistoryChats({ user_id: useUserStore.getState().userId });
        
        if (response.success && response.data) {
          console.log('历史对话加载成功:', response.data);
          
          // 将历史对话转换为本地对话格式
          const historyConversations: Conversation[] = response.data.map((chat: HistoryChatItem) => {
            // 处理消息数据
            let messages: Message[] = [];
            
            // 如果API返回了消息数据，转换格式
            if (chat.messages && Array.isArray(chat.messages)) {
              // 过滤掉system消息，只保留user和assistant消息
              const userMessages = chat.messages.filter(msg => msg.role !== 'system');
              messages = userMessages.map((msg, index) => ({
                id: `${chat.session_id}_msg_${index}`,
                content: msg.content,
                role: msg.role as 'user' | 'assistant',
                timestamp: new Date(chat.created_at)
              }));
            } else if (chat.prompt) {
              // 如果没有完整消息但有prompt，创建初始用户消息
              messages = [{
                id: `${chat.session_id}_prompt`,
                content: chat.prompt,
                role: 'user',
                timestamp: new Date(chat.created_at)
              }];
            }
            
            // 生成对话标题
            let title = chat.title;
            if (!title) {
              // 如果没有title，使用prompt的前20个字符作为标题
              title = chat.prompt ? 
                (chat.prompt.length > 20 ? chat.prompt.slice(0, 20) + '...' : chat.prompt) : 
                '新对话';
            }
            
            return {
              id: chat.chat_id || chat.session_id, // 使用session_id作为fallback
              title: title,
              sessionId: chat.session_id,
              messages: messages,
              lastMessage: new Date(chat.updated_at),
              prompt: chat.prompt
            };
          });
          
          // 如果没有历史对话，创建一个默认的新对话
          if (historyConversations.length === 0) {
            const defaultConversation: Conversation = {
              id: '1',
              title: '新对话',
              sessionId: generateSessionId(useUserStore.getState().userId),
              messages: [],
              lastMessage: new Date()
            };
            setConversations([defaultConversation]);
            setCurrentConversationId('1');
          } else {
            setConversations(historyConversations);
            setCurrentConversationId(historyConversations[0].id);
          }
        } else {
          console.error('加载历史对话失败:', response.error || response.detail);
          // 如果加载失败，创建一个默认对话
          const defaultConversation: Conversation = {
            id: '1',
            title: '新对话',
            sessionId: generateSessionId(useUserStore.getState().userId),
            messages: [],
            lastMessage: new Date()
          };
          setConversations([defaultConversation]);
          setCurrentConversationId(defaultConversation.id);
          
          if (response.detail) {
            setError('加载历史对话失败: ' + response.detail.map(d => d.msg).join(', '));
          } else {
            setError(response.error || '加载历史对话失败');
          }
        }
      } catch (error) {
        console.error('加载历史对话异常:', error);
        // 异常情况下也创建默认对话
        const defaultConversation: Conversation = {
          id: '1',
          title: '新对话',
          sessionId: generateSessionId(useUserStore.getState().userId),
          messages: [],
          lastMessage: new Date()
        };
        setConversations([defaultConversation]);
        setCurrentConversationId(defaultConversation.id);
        setError('网络错误，无法加载历史对话');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistoryChats();
  }, []);

  const currentConversation = conversations.find(conv => conv.id === currentConversationId);

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() || isLoading) return;

    const currentConv = conversations.find(conv => conv.id === currentConversationId);
    if (!currentConv) return;

    setError(null);
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    // 添加用户消息到对话
    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          messages: [...conv.messages, userMessage],
          lastMessage: new Date(),
          title: conv.messages.length === 1 ? content.slice(0, 20) + (content.length > 20 ? '...' : '') : conv.title
        };
      }
      return conv;
    }));

    // 创建一个空的AI消息，用于流式输出
    const aiMessageId = (Date.now() + 1).toString();
    const targetConversationId = currentConversationId; // 捕获当前值
    
    const initialAiMessage: Message = {
      id: aiMessageId,
      content: '', // 初始为空，等待流式数据
      role: 'assistant',
      timestamp: new Date()
    };

    console.log(`[初始化] 创建AI消息 ID: ${aiMessageId}, 目标对话: ${targetConversationId}`);

    // 立即添加一个空的AI消息占位
    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConversationId) {
        console.log(`[初始化] 添加AI消息占位到对话 ${conv.id}`);
        return {
          ...conv,
          messages: [...conv.messages, initialAiMessage],
          lastMessage: new Date()
        };
      }
      return conv;
    }));

    try {
      // 使用流式API
      await sendChatMessageStream(
        {
          files,
          user_id: useUserStore.getState().userId,
          session_id: currentConv.sessionId,  // 使用从store中获取的真实session_id
          prompt: content,
          chatModelInfo
        },
        (chunk: string, isComplete: boolean) => {
          console.log(`[AI-${aiMessageId}] 收到数据块:`, chunk, '是否完成:', isComplete);
          console.log(`[状态检查] 目标对话ID:`, targetConversationId);
          
          if (isComplete) {
            console.log(`[AI-${aiMessageId}] 流式响应完成`);
            setIsLoading(false);
            return;
          }

          // 只有在收到真正的内容时才更新消息
          if (chunk && chunk.trim()) {
            // 更新AI消息内容 - 使用函数式更新确保可靠性
            setConversations(prevConversations => {
              console.log(`[AI-${aiMessageId}] 开始更新消息内容:`, chunk);
              console.log(`[状态检查] 当前对话列表数量:`, prevConversations.length);
              
              // 使用 Array.from 确保创建新数组
              const newConversations = Array.from(prevConversations).map(conv => {
                console.log(`[状态检查] 检查对话 ID:`, conv.id, '目标 ID:', targetConversationId);
                
                if (conv.id === targetConversationId) {
                  console.log(`[状态检查] 找到目标对话，消息数:`, conv.messages.length);
                  
                  // 使用 Array.from 确保创建新数组
                  const newMessages = Array.from(conv.messages).map(msg => {
                    if (msg.id === aiMessageId) {
                      const newContent = msg.content + chunk;
                      console.log(`[AI-${aiMessageId}] 更新消息内容 -> 新长度:`, newContent.length);
                      return {
                        ...msg,
                        content: newContent,
                        timestamp: new Date() // 更新时间戳触发重渲染
                      };
                    }
                    return msg;
                  });
                  
                  const updatedConv = {
                    ...conv,
                    messages: newMessages,
                    lastMessage: new Date()
                  };
                  
                  console.log(`[状态检查] 更新后的对话消息数:`, updatedConv.messages.length);
                  return updatedConv;
                }
                return conv;
              });
              
              console.log(`[状态检查] 返回新的对话列表`);
              return newConversations;
            });
          }
        }
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      setError('网络错误，请检查您的连接');
      
      // 更新AI消息为错误内容
      setConversations(prev => prev.map(conv => {
        if (conv.id === targetConversationId) {
          return {
            ...conv,
            messages: conv.messages.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: '网络连接出现问题，请检查网络后重试。' }
                : msg
            ),
            lastMessage: new Date()
          };
        }
        return conv;
      }));
      
      setIsLoading(false);
    }
  };

  const handleNewConversation = async () => {
    // 检查是否已经有空对话（没有消息的对话）
    const emptyConversation = conversations.find(conv => conv.messages.length === 0);
    
    if (emptyConversation) {
      // 如果已经有空对话，直接切换到该对话
      console.log('发现空对话，直接切换:', emptyConversation);
      setCurrentConversationId(emptyConversation.id);
      setError(null);
      
      // 在手机端切换后隐藏侧边栏
      if (isMobile) {
        setIsSidebarVisible(false);
      }
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 调用后端创建新对话接口
      const response = await createNewChat({ user_id: useUserStore.getState().userId });
      
      if (response.success && response.data) {
        const newConversation: Conversation = {
          id: response.data.session_id,  // 使用后端返回的session_id作为id
          title: response.data.title || '新对话',
          sessionId: response.data.session_id,  // 使用后端返回的session_id
          messages: [],
          lastMessage: new Date()
        };

        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        
        // 在手机端创建后隐藏侧边栏
        if (isMobile) {
          setIsSidebarVisible(false);
        }
        
        console.log('新对话创建成功:', newConversation);
      } else {
        throw new Error(response.error || '创建对话失败');
      }
    } catch (error) {
      console.error('创建新对话失败:', error);
      setError('创建新对话失败，请重试');
      
      // 如果接口失败，依然创建本地对话
      const fallbackConversation: Conversation = {
        id: generateSessionId(useUserStore.getState().userId),
        title: '新对话',
        sessionId: generateSessionId(useUserStore.getState().userId),
        messages: [],
        lastMessage: new Date()
      };

      setConversations(prev => [fallbackConversation, ...prev]);
      setCurrentConversationId(fallbackConversation.id);
      
      // 在手机端创建后隐藏侧边栏
      if (isMobile) {
        setIsSidebarVisible(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    const selectedConversation = conversations.find(conv => conv.id === conversationId);
    
    if (!selectedConversation) {
      console.error('找不到指定的对话:', conversationId);
      return;
    }
    
    console.log('切换到对话:', {
      id: selectedConversation.id,
      title: selectedConversation.title,
      messageCount: selectedConversation.messages.length,
      prompt: selectedConversation.prompt
    });
    
    // 设置当前对话 ID
    setCurrentConversationId(conversationId);
    
    // 清除错误状态
    setError(null);
    
    // 在手机端选择对话后自动隐藏侧边栏
    if (isClient && isMobile) {
      setIsSidebarVisible(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <div className="flex h-full relative">
      {/* 遗罩层 - 仅在手机端侧边栏显示时显示 */}
      {isClient && isMobile && isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}
      
      {/* 左侧历史对话 */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isClient && isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative',
        isSidebarVisible ? 'translate-x-0' : '-translate-x-full',
        !isClient || (!isMobile && !isSidebarVisible) ? 'w-0 overflow-hidden' : ''
      )}>
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onClose={isClient && isMobile ? () => setIsSidebarVisible(false) : undefined}
          onToggleSidebar={toggleSidebar}
          isLoading={isLoading}
          isLoadingHistory={isLoadingHistory}
        />
      </div>
      
      {/* 右侧对话区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {/* 侧边栏切换按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {isSidebarVisible ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </Button>
          
          {/* 当前对话标题 */}
          <h2 className="text-lg font-medium text-foreground truncate">
            {currentConversation?.title || '新对话'}
          </h2>
        </div>
        {/* 错误提示 */}
        {error && (
          <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 mx-4 mt-4 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
              <Button 
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => setError(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        <ChatArea
          conversation={currentConversation}
          isLoading={isLoading}
        />
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}