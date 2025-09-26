'use client';

import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // 打字速度，单位毫秒
  isStreaming?: boolean; // 是否正在流式输出
  onComplete?: () => void; // 打字完成回调
}

export default function TypewriterText({ 
  text, 
  speed = 50, 
  isStreaming = false,
  onComplete 
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // 如果正在流式输出，直接显示最新的文本
    if (isStreaming) {
      setDisplayText(text);
      setCurrentIndex(text.length);
      return;
    }

    // 如果文本长度减少了（新消息），重置状态
    if (text.length < currentIndex) {
      setDisplayText('');
      setCurrentIndex(0);
    }

    // 如果还有字符需要显示
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex === text.length && text.length > 0) {
      // 打字完成
      onComplete?.();
    }
  }, [text, currentIndex, speed, isStreaming, onComplete]);

  // 重置效果当文本完全改变时
  useEffect(() => {
    if (text.length === 0) {
      setDisplayText('');
      setCurrentIndex(0);
    }
  }, [text]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {displayText}
      {/* 显示打字光标，只在非流式输出且正在打字时显示 */}
      {!isStreaming && currentIndex < text.length && text.length > 0 && (
        <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
      )}
      {/* 流式输出时的光标 */}
      {isStreaming && text.length > 0 && (
        <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
      )}
    </span>
  );
}