'use client';

import { useEffect, useRef } from 'react';

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
}

interface ChatAreaProps {
  conversation?: Conversation;
  isLoading: boolean;
}

export default function ChatArea({ conversation, isLoading }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  // 添加调试信息
  useEffect(() => {
    if (conversation) {
      console.log('[ChatArea] 当前对话:', conversation.id);
      console.log('[ChatArea] 消息数量:', conversation.messages.length);
      console.log('[ChatArea] 消息列表:', conversation.messages);
    }
  }, [conversation]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            你好！我是小数小科
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            有什么可以帮助您的吗？
          </p>
          <p className="text-gray-500 dark:text-gray-500 mt-2 text-sm">
            请在下方输入框中输入您的问题
          </p>
        </div>
      </div>
    );
  }

  // 如果对话存在但没有消息，显示欢迎信息
  if (conversation.messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-full">
          <div className="text-center">
             <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              你好！我是小数小科
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              有什么可以帮助您的吗？
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              请在下方输入框中输入您的问题
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">AI</span>
                </div>
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white ml-auto'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {/* 如果是AI消息且内容为空且正在加载，显示“正在思考” */}
                {message.role === 'assistant' && !message.content && isLoading ? (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm">
                      正在思考...
                    </span>
                  </div>
                ) : (
                  <>
                    {message.content}
                    {/* 如果是正在输出的AI消息且内容不为空，显示光标 */}
                    {message.role === 'assistant' && 
                     message.content &&
                     isLoading && 
                     conversation?.messages[conversation.messages.length - 1]?.id === message.id && (
                      <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
                    )}
                  </>
                )}
              </div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user'
                    ? 'text-blue-100'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 dark:bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white dark:text-gray-900 text-sm font-medium">
                    你
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 消息结束标记 */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}