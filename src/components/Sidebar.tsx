import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, X, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onClose?: () => void;
  onToggleSidebar?: () => void;
  isLoading?: boolean;
  isLoadingHistory?: boolean;
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onClose,
  onToggleSidebar,
  isLoading = false,
  isLoadingHistory = false
}: SidebarProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return '今天';
    } else if (diffInHours < 48) {
      return '昨天';
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const truncateTitle = (title: string | undefined, maxLength: number = 20) => {
    if (!title || title.length <= maxLength) return title || '新对话';
    return title.substring(0, maxLength) + '...';
  };

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col h-full">
      {/* 标题栏 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-foreground">
            小数小科
          </h1>
          {/* 关闭按钮 - 仅在移动端显示 */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* 新建对话按钮 */}
        <Button
          onClick={onNewConversation}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              新建对话
            </>
          )}
        </Button>
      </div>

      {/* 对话历史列表 */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            暂无对话历史
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "group cursor-pointer mb-2 transition-all duration-200 hover:shadow-md active:scale-95 border",
                  currentConversationId === conversation.id
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border'
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-sm font-medium text-foreground truncate flex-1">
                      {truncateTitle(conversation.title)}
                    </h3>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {formatDate(conversation.lastMessage)}
                    </span>
                  </div>
                  
                  {/* 显示 prompt 内容，如果没有 prompt 则显示最后一条消息 */}
                  {conversation.prompt ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.prompt}
                    </p>
                  ) : (
                    conversation.messages.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.messages[conversation.messages.length - 1].content}
                      </p>
                    )
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}