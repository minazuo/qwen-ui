# 聊天通用组件库

这个组件库提供了一套用于构建对话界面的通用组件。设计目标是支持多种不同类型的对话API，同时维持一致的用户体验。

## 主要组件

### 消息气泡组件
- `AssistantMessage`: AI助手消息气泡
- `UserMessage`: 用户消息气泡

### 消息列表
- `MessageList`: 渲染对话消息列表

### 会话侧边栏
- `Sidebar`: 会话列表侧边栏
- `MobileSidebar`: 移动端侧边栏

### 输入组件
- `ChatInput`: 聊天输入区域

## 类型定义

`types.ts` 文件包含所有通用接口定义，包括：
- `MessageBase`: 基础消息接口
- `MessageExtended`: 扩展消息接口
- `SessionItemBase`: 基础会话项接口
- `SessionItemExtended`: 扩展会话项接口

## 适配器

适配器用于将不同API的数据结构转换为通用组件期望的格式：
- `adaptChatMessage`: 转换普通聊天消息
- `adaptChatSession`: 转换聊天会话
- `adaptPromptToSidebar`: 将提示词转换为侧边栏项目

## 使用示例

### 标准聊天

```tsx
import { MessageList } from '@/components/chat-common/message-list'
import { adaptChatMessage } from '@/components/chat-common/adapters'

// 在组件中
const { messages, isLoading } = useChatSession()

// 渲染消息列表
return (
  <MessageList
    messages={messages.map(adaptChatMessage)}
    isLoading={isLoading}
    onRegenerate={handleRegenerate}
  />
)
```

### 提示词聊天

```tsx
import { MessageList } from '@/components/chat-common/message-list'
import { adaptMessage } from '@/components/chat-common/adapters'

// 在组件中
const { messages, isLoading } = usePromptChat()

// 渲染消息列表
return (
  <MessageList
    messages={adaptMessage(messages, 'prompt')}
    isLoading={isLoading}
  />
)
```

## 扩展说明

要添加新的对话接口，通常只需：

1. 创建适配器函数将新API的数据结构转换为通用格式
2. 创建专用的Hook管理与该API的交互
3. 在UI组件中使用通用组件渲染内容

这样可以保持UI的一致性，同时支持多种不同的后端API。 