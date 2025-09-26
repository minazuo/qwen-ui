'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import Welcome from './Welcome';
import TypewriterText from './TypewriterText';

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

  // 如果对话存在但没有消息，显示欢迎信息
  if (!conversation || conversation.messages.length === 0) {
    return (
     <Welcome></Welcome>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-4",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {/* AI头像 */}
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            )}
            
            {/* 消息内容卡片 */}
            <Card
              className={cn(
                "max-w-[70%] px-4 py-3 shadow-sm",
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-card text-card-foreground'
              )}
            >
              <div className="whitespace-pre-wrap break-words">
                {/* 如果是AI消息且内容为空且正在加载，显示"正在思考" */}
                {message.role === 'assistant' && !message.content && isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm">
                      正在思考...
                    </span>
                  </div>
                ) : message.role === 'assistant' ? (
                  /* AI消息使用打字机效果 */
                  <TypewriterText 
                    text={message.content}
                    speed={30}
                    isStreaming={isLoading && conversation?.messages[conversation.messages.length - 1]?.id === message.id}
                  />
                ) : (
                  /* 用户消息直接显示 */
                  message.content
                )}
              </div>
              <div
                className={cn(
                  "text-xs mt-2",
                  message.role === 'user'
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                )}
              >
                {formatTime(message.timestamp)}
              </div>
            </Card>

            {/* 用户头像 */}
            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-secondary-foreground" />
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