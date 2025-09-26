"use client"

import { AssistantMessage, UserMessage } from "../message-bubble"
import { WebSearchResponse } from "@/services/chat/chat"

interface AIBubbleWrapperProps {
    content: string
    isLoading?: boolean
    onRegenerate?: (regenerateMode: 'regenerate' | 'continue') => void
    thinkingContent?: string
    thinkingTime?: number
    webSearchData?: WebSearchResponse | null
}

export function AIBubbleWrapper({
    content,
    isLoading,
    onRegenerate,
    thinkingContent,
    thinkingTime = 0,
    webSearchData
}: AIBubbleWrapperProps) {
    return (
        <AssistantMessage
            content={content}
            isLoading={isLoading}
            metadata={{
                thinking: thinkingContent,
                thinkingTime,
                webSearchData: webSearchData || undefined
            }}
            actions={{
                onRegenerate
            }}
        />
    )
}

interface UserBubbleWrapperProps {
    content: string
}

export function UserBubbleWrapper({ content }: UserBubbleWrapperProps) {
    return <UserMessage content={content} />
} 