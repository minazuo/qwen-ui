"use client"

import { ChatInput as CommonChatInput, ModelType as CommonModelType, ChatInputOptions, ChatInputActions } from "../input/chat-input"
import { useUserStore, ModelType } from "@/store/user"
import { useEffect } from "react"

interface ChatInputWrapperProps {
    onSend: (message: string, enableDeepThinking: boolean, enableWebSearch: boolean, model?: ModelType, files?: File[], imageFiles?: File[]) => void
    onStop?: () => void
    isLoading: boolean
    isStreaming?: boolean
    className?: string
    // 控制功能显示的配置 - 老接口，保留向后兼容
    hideDeepThinking?: boolean
    hideWebSearch?: boolean
    hideModelSelection?: boolean
    hideFileUpload?: boolean
    hideImageUpload?: boolean
    // 直接传递配置和动作的新接口
    options?: Partial<ChatInputOptions>
    actions?: Partial<ChatInputActions>
}

export function ChatInput({
    onSend,
    onStop,
    isLoading,
    isStreaming,
    className,
    hideDeepThinking = false,
    hideWebSearch = false,
    hideModelSelection = false,
    hideFileUpload = false,
    hideImageUpload = false,
    options: customOptions,
    actions: customActions
}: ChatInputWrapperProps) {
    // 从用户设置获取状态
    const {
        selectedModel,
        enableDeepThinking,
        enableWebSearch,
        setModel,
        setDeepThinking,
        setWebSearch
    } = useUserStore()

    // 根据功能隐藏设置调整功能状态
    useEffect(() => {
        if (hideDeepThinking && enableDeepThinking) {
            setDeepThinking(false)
        }
        if (hideWebSearch && enableWebSearch) {
            setWebSearch(false)
        }
    }, [hideDeepThinking, hideWebSearch, enableDeepThinking, enableWebSearch, setDeepThinking, setWebSearch])

    // 类型安全转换
    const handleModelChange = (model: CommonModelType) => {
        setModel(model as ModelType)
    }

    // 发送消息包装函数
    const handleSend = (
        message: string,
        enableDeepThinking: boolean,
        enableWebSearch: boolean,
        model?: string,
        files?: File[],
        imageFiles?: File[]
    ) => {
        onSend(message, enableDeepThinking, enableWebSearch, model as ModelType, files, imageFiles)
    }

    // 合并选项 - 优先使用自定义选项，然后使用 hide* 属性，最后使用默认值
    const mergedOptions: ChatInputOptions = {
        // 基础配置 - 设置按钮是否显示和默认激活状态
        // 默认按钮显示但不激活
        hideDeepThinking: hideDeepThinking, // 是否隐藏按钮
        hideWebSearch: hideWebSearch, // 是否隐藏按钮

        // 从store读取激活状态，默认沿用store中的值（持久化存储）
        enableDeepThinking: enableDeepThinking,
        enableWebSearch: enableWebSearch,

        selectedModel,
        availableModels: hideModelSelection ? [] : [],
        enableFileUpload: !hideFileUpload,
        enableImageUpload: !hideImageUpload,

        // 自定义选项覆盖所有之前的配置
        ...(customOptions || {})
    }

    // 合并动作 - 优先使用自定义动作，然后使用默认值
    const mergedActions: ChatInputActions = {
        onDeepThinkingChange: hideDeepThinking ? undefined : setDeepThinking,
        onWebSearchChange: hideWebSearch ? undefined : setWebSearch,
        onModelChange: hideModelSelection ? undefined : handleModelChange,

        // 自定义动作覆盖所有之前的配置
        ...(customActions || {})
    }

    return (
        <CommonChatInput
            onSend={handleSend}
            onStop={onStop}
            isLoading={isLoading}
            isStreaming={isStreaming}
            className={className}
            options={mergedOptions}
            actions={mergedActions}
        />
    )
} 