// 导出所有通用组件接口
export * from './message-bubble';
export * from './message-list';
export * from './sidebar';
export * from './types';
export * from './adapters';

// 导出指定的类型定义
export { type ChatInputProps, type ChatInputOptions, type ChatInputActions } from './input';
export { type ChatContainerProps, type ChatContainerConfig } from './container';

// 导出包装组件 - 为保持兼容性改名导出
import { ChatInput } from './wrappers/chat-input-wrapper';
import { ChatSidebar as CommonChatSidebar } from './wrappers/chat-sidebar-wrapper';
import { MobileSidebar as CommonMobileSidebar } from './wrappers/mobile-sidebar-wrapper';
import { MessageListWrapper as MessageList } from './wrappers/message-list-wrapper';
import { AIBubbleWrapper as AssistantMessage, UserBubbleWrapper as UserMessage } from './wrappers/bubbles-wrapper';
import { ChatContainer as CommonChatContainer } from './wrappers/chat-container-wrapper';

export {
    ChatInput,
    CommonChatSidebar as ChatSidebar,
    CommonMobileSidebar as MobileSidebar,
    MessageList,
    AssistantMessage,
    UserMessage,
    CommonChatContainer as ChatContainer
}; 