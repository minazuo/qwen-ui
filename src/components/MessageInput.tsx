'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Paperclip, Send, X, File, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading: boolean;
}

export default function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      // 重置高度以获取正确的scrollHeight
      textareaRef.current.style.height = '60px';
      // 设置新高度，但限制最大高度
      const scrollHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim(), files.length > 0 ? files : undefined);
      setMessage('');
      setFiles([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative border-t bg-background border-border">
      <div className="relative p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* 输入区域 */}
          <Card className="min-h-[120px] transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-4">
              {/* 文件预览区 */}
              {files.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                      <File className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground truncate max-w-[150px]">
                        {file.name}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                {/* 文本输入区域 */}
                <div className="flex-1 min-h-[60px]">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="请输入您的问题..."
                    disabled={isLoading}
                    className={cn(
                      "min-h-[60px] resize-none border-none shadow-none focus-visible:ring-0 bg-transparent",
                      "text-foreground placeholder-muted-foreground"
                    )}
                    style={{
                      maxHeight: '200px',
                      overflowY: message.length > 200 ? 'auto' : 'hidden'
                    }}
                  />
                </div>
                
                {/* 分隔线 */}
                <div className="h-px bg-border my-3" />
                
                {/* 下侧区域 - 按钮栏 */}
                <div className="flex items-center justify-between">
                  {/* 左侧 - 上传和信息 */}
                  <div className="flex items-center gap-4">
                    {/* 文件上传按钮 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">附件</span>
                    </Button>
                    
                    {/* 状态信息 */}
                    <div className="flex items-center gap-3 text-xs">
                      {/* 字符计数 */}
                      <div className={cn(
                        "transition-colors",
                        message.length > 1800 ? 'text-destructive' :
                        message.length > 1500 ? 'text-yellow-500' :
                        'text-muted-foreground'
                      )}>
                        {message.length}/2000
                      </div>
                      
                      {/* 文件数量显示 */}
                      {files.length > 0 && (
                        <div className="flex items-center gap-1 text-primary">
                          <File className="w-3 h-3" />
                          {files.length} 个文件
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 右侧 - 发送按钮 */}
                  <Button
                    type="submit"
                    disabled={!message.trim() || isLoading}
                    className="rounded-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">发送中...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">发送</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        
        {/* 提示文字 */}
        <div className="mt-3 text-xs text-muted-foreground text-center">
          按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> 发送消息，
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift + Enter</kbd> 换行
        </div>
      </div>
    </div>
  );
}