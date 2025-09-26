'use client';

import { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading: boolean;
}

export default function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动调整输入框高度 - 适配新的固定容器
  useEffect(() => {
    if (textareaRef.current) {
      // 重置高度以获取正确的scrollHeight
     
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
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"  style={{height: '188px'}}>
      <div className="max-w-4xl mx-auto">
        {/* 文件预览区 */}
        {files.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* 输入区域 - 外框和新布局 */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 h-[120px] p-3">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* 上侧区域 - textarea */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入您的问题..."
                disabled={isLoading}
           
                className="w-full h-full resize-none bg-transparent border-none outline-none 
                         text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                         disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            {/* 下侧区域 - 按钮栏 */}
            <div className="flex items-center justify-between">
              {/* 左侧 - 上传图标和信息 */}
              <div className="flex items-center gap-3">
                {/* 文件上传按钮 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  title="上传文件"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  附件
                </button>
                
                {/* 字符计数 */}
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {message.length}/2000
                </div>
                
                {/* 文件数量显示 */}
                {files.length > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {files.length} 个文件
                  </div>
                )}
              </div>
              
              {/* 右侧 - 发送按钮 */}
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 
                         text-white disabled:text-gray-500 dark:disabled:text-gray-400
                         rounded-md px-4 py-1.5 font-medium transition-all duration-200 text-sm
                         disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    发送中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    发送
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* 提示文字 */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          按 Enter 发送消息，Shift + Enter 换行
        </div>
      </div>
    </div>
  );
}