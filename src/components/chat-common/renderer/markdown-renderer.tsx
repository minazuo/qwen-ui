"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'
import React, { useMemo, useState } from 'react'
import 'katex/dist/katex.min.css'


interface MarkdownRendererProps {
    content: string
    className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    // 使用更简单的替换方式，保持原始内容结构
    const processedContent = useMemo(() => {
        return content
            // 处理数学公式中的行列式符号，更准确地替换竖线
            .replace(/\$(.*?)\$/g, (match) => {
                // 替换行列式符号 |A| 为 \lvert A \rvert
                return match.replace(/\|([^|]*?)\|/g, '\\lvert $1 \\rvert');
            })
            .replace(/\$\$(.*?)\$\$/g, (match) => {
                return match.replace(/\|([^|]*?)\|/g, '\\lvert $1 \\rvert');
            })
            .replace(/\\\[([\s\S]*?)\\\]/g, (_, captured) => {
                // 处理 \[...\] 格式
                const processed = captured.replace(/\|([^|]*?)\|/g, '\\lvert $1 \\rvert');
                return `$$${processed}$$`;
            })
            .replace(/\\\(([\s\S]*?)\\\)/g, (_, captured) => {
                // 处理 \(...\) 行内公式格式
                const processed = captured.replace(/\|([^|]*?)\|/g, '\\lvert $1 \\rvert');
                return `$${processed}$`;
            });
    }, [content]);

    const copyToClipboard = async (text: string) => {
        try {
            // 优先使用现代 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            // 后备方案：使用传统的 document.execCommand
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (error) {
                textArea.remove();
                return false;
            }
        } catch (error) {
            return false;
        }
    };

    return (
        <div className={cn("prose prose-base dark:prose-invert max-w-none text-base", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeKatex, {
                    strict: false,
                    output: 'html',
                    throwOnError: false,
                    errorColor: '#FF0000',
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false },
                    ]
                }]]}
                components={{
                    a({ node, children, ...props }) {
                        return (
                            <a target="_blank" rel="noopener noreferrer" {...props}>
                                {children}
                            </a>
                        );
                    },
                    code(props) {
                        const { inline, className, children, ...rest } = props as {
                            inline?: boolean;
                            className?: string;
                            children: React.ReactNode;
                            [key: string]: any;
                        }

                        const match = /language-(\w+)/.exec(className || '')
                        const code = String(children).replace(/\n$/, '')

                        if (!inline && match) {
                            return <CodeBlock code={code} language={match[1]} {...rest} />
                        }

                        return (
                            <code className={className} {...rest}>
                                {children}
                            </code>
                        )
                    }
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    )
}

// 新的 CodeBlock 组件
function CodeBlock({ code, language, ...rest }: { code: string; language: string;[key: string]: any }) {
    const [copyStatus, setCopyStatus] = useState<string>('')

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (error) {
                textArea.remove();
                return false;
            }
        } catch (error) {
            return false;
        }
    };

    return (
        <div className="relative group">
            <div className="flex items-center justify-between bg-gray-800 text-xs text-gray-400 px-4 py-1 rounded-t-md">
                <span>{language}</span>
                <div className="flex items-center">
                    {copyStatus && (
                        <span className="text-green-400 mr-2">{copyStatus}</span>
                    )}
                    <button
                        onClick={async () => {
                            const success = await copyToClipboard(code);
                            setCopyStatus(success ? '已复制' : '复制失败');
                            setTimeout(() => setCopyStatus(''), 2000);
                        }}
                        className="p-1 rounded hover:bg-gray-700"
                        title="复制代码"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                {...rest}
                customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    )
}