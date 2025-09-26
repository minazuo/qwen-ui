"use client"

import { cn } from "@/lib/utils"
import { MessageBubbleProps } from "../types"

export function UserMessage({ content }: MessageBubbleProps) {
    return (
        <div className="group flex items-start flex-row-reverse gap-0 px-2 sm:px-0">
            <div className="flex flex-col gap-2 items-end w-full max-w-full">
                <div className="rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur supports-[backdrop-filter]:bg-blue-50/60 dark:supports-[backdrop-filter]:bg-blue-900/10 shadow-sm ring-1 ring-inset ring-blue-200/70 dark:ring-blue-800/30 break-words max-w-[100%]">
                    <div className="whitespace-pre-wrap">{content}</div>
                </div>
            </div>
        </div>
    )
} 