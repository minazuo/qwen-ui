'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import MessageInput from './MessageInput';
import { sendChatMessageStream, generateSessionId, defaultChatModelInfo, type ChatModelInfo } from '../lib/api';

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
}

export default function ChatContainer() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: '新对话',
      sessionId: generateSessionId('123'),
      messages: [
        // 初始不添加AI消息，等待用户发送第一条消息时再添加
      ],
      lastMessage: new Date()
    }
  ]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatModelInfo, setChatModelInfo] = useState<ChatModelInfo>(defaultChatModelInfo);

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
          user_id: '123',
          session_id:'user_123_session_fe48ddad-74a9-45b2-bde9-e3a5dba9b834',
          // session_id: currentConv.sessionId,
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

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: '新对话',
      sessionId: generateSessionId('123'),
      messages: [
        // 初始不添加AI消息，等待用户发送消息时再添加
      ],
      lastMessage: new Date()
    };

    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    setError(null);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左侧历史对话 */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />
      
      {/* 右侧对话区域 */}
      <div className="flex-1 flex flex-col">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 mx-4 mt-4 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
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