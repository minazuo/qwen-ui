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
    <div className="relative border-t bg-gray-50 dark:bg-gray-900 border-gray-200/30 dark:border-gray-700/30">
      <div className="relative p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* 输入区域 - 浮动卡片效果 */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 min-h-[120px] p-4 transition-all duration-300 hover:shadow-3xl hover:border-gray-300/60 dark:hover:border-gray-600/60">
            
          {/* 文件预览区 */}
            {files.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-gray-200/50 dark:border-gray-600/50">
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
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* 上侧区域 - textarea */}
              <div className="flex-1 min-h-[60px]">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入您的问题..."
                  disabled={isLoading}
                  className="w-full h-full min-h-[60px] resize-none bg-transparent border-none outline-none 
                           text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                           disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
                  style={{
                    maxHeight: '200px',
                    overflowY: message.length > 200 ? 'auto' : 'hidden'
                  }}
                />
              </div>
              
              {/* 分隔线 */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-600 to-transparent my-3"></div>
              
              {/* 下侧区域 - 按钮栏 */}
              <div className="flex items-center justify-between">
                {/* 左侧 - 上传图标和信息 */}
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 
                             hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 text-sm
                             disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                    title="上传文件"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="hidden sm:inline">附件</span>
                  </button>
                  
                  {/* 状态信息 */}
                  <div className="flex items-center gap-3 text-xs">
                    {/* 字符计数 */}
                    <div className={`transition-colors ${
                      message.length > 1800 ? 'text-red-500 dark:text-red-400' :
                      message.length > 1500 ? 'text-yellow-500 dark:text-yellow-400' :
                      'text-gray-400 dark:text-gray-500'
                    }`}>
                      {message.length}/2000
                    </div>
                    
                    {/* 文件数量显示 */}
                    {files.length > 0 && (
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {files.length} 个文件
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 右侧 - 发送按钮 */}
                <button
                  type="submit"
                  disabled={!message.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                           disabled:from-gray-300 dark:disabled:from-gray-600 disabled:to-gray-400 dark:disabled:to-gray-700
                           text-white disabled:text-gray-500 dark:disabled:text-gray-400
                           rounded-xl px-6 py-2.5 font-medium transition-all duration-200 text-sm
                           disabled:cursor-not-allowed shadow-lg hover:shadow-xl
                           flex items-center gap-2 backdrop-blur-sm
                           transform hover:scale-105 disabled:hover:scale-100"
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
                      <span className="hidden sm:inline">发送中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="hidden sm:inline">发送</span>
                    </>
                  )}
                </button>
              </div>
            </form>
           
          </div>
          
          
        </div>
         {/* 提示文字 */}
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center opacity-70">
              按 <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> 发送消息，
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Shift + Enter</kbd> 换行
            </div>
      </div>
    </div>
  );
}