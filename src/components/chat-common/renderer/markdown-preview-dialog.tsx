"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MarkdownRenderer } from "./markdown-renderer"
import { useLocale } from "@/contexts/i18n-context"
import { i18n } from "@/config/i18n"

interface MarkdownPreviewDialogProps {
    isOpen: boolean
    onClose: () => void
    content: string
}

export function MarkdownPreviewDialog({
    isOpen,
    onClose,
    content
}: MarkdownPreviewDialogProps) {
    const { locale } = useLocale()
    const t = i18n[locale].apps.markdown

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{t.title}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 h-full p-6">
                    <div className="max-w-3xl mx-auto">
                        {/* 使用支持GFM和HTML的Markdown渲染器 */}
                        <MarkdownRenderer content={content} className="text-base" />
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
} 
