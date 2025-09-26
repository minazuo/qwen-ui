"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendHorizontal, Loader2, Brain, Upload, Image as ImageIcon, PauseCircle, Globe, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// 通用模型类型
export type ModelType = string;

// 功能选项
export interface ChatInputOptions {
    enableDeepThinking?: boolean;
    enableWebSearch?: boolean;
    selectedModel?: ModelType;
    availableModels?: Array<{ value: string, label: string }>;
    enableFileUpload?: boolean;
    enableImageUpload?: boolean;
    // 控制功能按钮的可见性
    hideDeepThinking?: boolean;
    hideWebSearch?: boolean;
}

// 自定义选项变更处理
export interface ChatInputActions {
    onDeepThinkingChange?: (enabled: boolean) => void;
    onWebSearchChange?: (enabled: boolean) => void;
    onModelChange?: (model: ModelType) => void;
}

// 基础输入属性
export interface ChatInputProps {
    onSend: (message: string, enableDeepThinking: boolean, enableWebSearch: boolean, model?: ModelType, files?: File[], imageFiles?: File[]) => void;
    onStop?: () => void;
    isLoading: boolean;
    isStreaming?: boolean;
    options?: ChatInputOptions;
    actions?: ChatInputActions;
    className?: string;
}

export function ChatInput({
    onSend,
    onStop,
    isLoading,
    isStreaming = false,
    options = {},
    actions = {},
    className
}: ChatInputProps) {
    // 提取选项，设置默认值
    const {
        enableDeepThinking = false,
        enableWebSearch = false,
        selectedModel = "default",
        availableModels = [
            { value: "default", label: "默认" },
            { value: "advanced", label: "高级" }
        ],
        enableFileUpload = true,
        enableImageUpload = true,
        // 控制功能按钮的可见性
        hideDeepThinking = false,
        hideWebSearch = false
    } = options;

    // 提取动作处理函数
    const {
        onDeepThinkingChange,
        onWebSearchChange,
        onModelChange
    } = actions;

    const [input, setInput] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    // 内部状态
    const [deepThinking, setDeepThinking] = useState(enableDeepThinking)
    const [webSearch, setWebSearch] = useState(enableWebSearch)
    const [model, setModel] = useState(selectedModel)
    // 添加输入法组合状态跟踪
    const [isInputComposing, setIsInputComposing] = useState(false)
    // 文件上传状态
    const [files, setFiles] = useState<File[]>([])
    const [imageFiles, setImageFiles] = useState<File[]>([])
    // 文件输入引用
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)

    // 外部选项变更时同步内部状态
    useEffect(() => {
        setDeepThinking(enableDeepThinking);
    }, [enableDeepThinking]);

    useEffect(() => {
        setWebSearch(enableWebSearch);
    }, [enableWebSearch]);

    useEffect(() => {
        setModel(selectedModel);
    }, [selectedModel]);

    // 自动调整文本区域高度
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // 重置高度，确保能获取到准确的scrollHeight
            textarea.style.height = '0px';

            // 根据屏幕大小设置不同的最小/最大高度
            const isSmallScreen = window.innerHeight < 1000;
            const minHeight = isSmallScreen ? '3vh' : '5vh'; // 小屏幕3vh，大屏幕5vh
            const maxHeight = isSmallScreen ? '15vh' : '30vh'; // 增加小屏幕最大高度

            // scrollHeight是文本的实际高度
            const scrollHeight = textarea.scrollHeight;

            // 设置新高度，使用计算值和vh单位
            textarea.style.height = scrollHeight ? `${Math.min(Math.max(scrollHeight, parseFloat(minHeight) * window.innerHeight / 100), parseFloat(maxHeight) * window.innerHeight / 100)}px` : minHeight;
        }
    }, [input]);

    const handleSend = () => {
        if ((!input.trim() && files.length === 0 && imageFiles.length === 0) || isLoading) return;
        onSend(input, deepThinking, webSearch, model, files.length > 0 ? files : undefined, imageFiles.length > 0 ? imageFiles : undefined);
        setInput("");
        // 清空文件
        setFiles([]);
        setImageFiles([]);
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // 检查是否正在输入法组合中
        // 使用nativeEvent.isComposing和我们自己跟踪的isInputComposing状态
        // 两者都检查以确保全面覆盖各种输入法和浏览器组合
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !isInputComposing) {
            e.preventDefault();
            handleSend();
        }
    }

    const toggleDeepThinking = () => {
        const newValue = !deepThinking;
        setDeepThinking(newValue);
        if (onDeepThinkingChange) {
            onDeepThinkingChange(newValue);
        }
    }

    const toggleWebSearch = () => {
        const newValue = !webSearch;
        setWebSearch(newValue);
        if (onWebSearchChange) {
            onWebSearchChange(newValue);
        }
    }

    // 处理模型选择变更
    const handleModelChange = (value: string) => {
        setModel(value);
        if (onModelChange) {
            onModelChange(value);
        }
    }

    // 处理暂停按钮点击
    const handleStopClick = () => {
        if (onStop) {
            onStop();
        }
    }

    // 处理文件上传
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // 将FileList转换为Array
            const filesArray = Array.from(e.target.files);
            setFiles(prev => [...prev, ...filesArray]);
            // 清空input value以允许重复选择相同文件
            e.target.value = '';
        }
    }

    // 处理图片上传
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // 将FileList转换为Array
            const filesArray = Array.from(e.target.files);
            // 验证是否为图片文件
            const imageFiles = filesArray.filter(file => file.type.startsWith('image/'));
            setImageFiles(prev => [...prev, ...imageFiles]);
            // 清空input value以允许重复选择相同文件
            e.target.value = '';
        }
    }

    // 删除文件
    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }

    // 删除图片
    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    }

    return (
        <div className={cn("flex flex-col gap-1 sm:gap-2 bg-background", className)}>
            {/* 文件上传预览区 */}
            {(files.length > 0 || imageFiles.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {/* 文本文件预览 */}
                    {files.map((file, index) => (
                        <div key={`file-${index}`} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs">
                            <Upload className="h-3 w-3" />
                            <span>{file.name}</span>
                            <button
                                onClick={() => removeFile(index)}
                                className="ml-1 text-blue-500 hover:text-blue-700"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}

                    {/* 图片文件预览 */}
                    {imageFiles.map((file, index) => (
                        <div key={`image-${index}`} className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs">
                            <ImageIcon className="h-3 w-3" />
                            <span>{file.name}</span>
                            <button
                                onClick={() => removeImage(index)}
                                className="ml-1 text-green-500 hover:text-green-700"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 主输入区域 */}
            <div className="flex flex-col gap-2 w-full relative p-0 sm:p-0.5 md:p-1">
                {/* 文本输入框 */}
                <div className="relative w-full">
                    <Textarea
                        ref={textareaRef}
                        placeholder="输入消息..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={() => setIsInputComposing(true)}
                        onCompositionEnd={() => setIsInputComposing(false)}
                        disabled={isLoading}
                        className="resize-none min-h-[3vh] sm:min-h-[5vh] max-h-[15vh] sm:max-h-[30vh] pr-24 md:pr-28 focus-visible:ring-0 focus-visible:ring-offset-0 border-0 focus:outline-none focus-visible:outline-none"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            boxShadow: 'none',
                            borderBottom: 'none',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none'
                        }}
                    />
                </div>

                {/* 功能按钮区域 */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                        {/* 模型选择下拉框 - 仅在有可用模型时显示 */}
                        {availableModels.length > 1 && (
                            <div className="flex-shrink-0">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div>
                                                <Select
                                                    value={model}
                                                    onValueChange={handleModelChange}
                                                >
                                                    <SelectTrigger
                                                        className="h-auto min-h-[2.5vh] sm:min-h-[3.5vh] rounded-md sm:rounded-xl bg-primary/10 hover:bg-primary/20 border-0 px-1 sm:px-2 text-xs sm:text-sm font-medium"
                                                    >
                                                        <SelectValue placeholder="选择模型" />
                                                    </SelectTrigger>
                                                    <SelectContent position="popper" side="top" sideOffset={5} className="z-[100]">
                                                        {availableModels.map((model) => (
                                                            <SelectItem key={model.value} value={model.value}>
                                                                {model.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" sideOffset={10}>
                                            <p>选择AI模型</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        )}

                        {/* 深度思考按钮 - 当未明确禁用时显示 (undefined或true时显示) */}
                        {!hideDeepThinking && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={toggleDeepThinking}
                                            variant="ghost"
                                            className={cn(
                                                "h-auto min-h-[2.5vh] sm:min-h-[3.5vh] rounded-md sm:rounded-xl shrink-0 px-1 sm:px-2 gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium",
                                                deepThinking
                                                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700"
                                                    : "bg-primary/10 hover:bg-primary/20",
                                            )}
                                        >
                                            <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="sr-only sm:not-sr-only sm:inline">深度思考</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>深度思考模式 {deepThinking ? '已开启' : '已关闭'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {/* 网络检索按钮 - 当未明确禁用时显示 (undefined或true时显示) */}
                        {!hideWebSearch && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={toggleWebSearch}
                                            variant="ghost"
                                            className={cn(
                                                "h-auto min-h-[2.5vh] sm:min-h-[3.5vh] rounded-md sm:rounded-xl shrink-0 px-1 sm:px-2 gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium",
                                                webSearch
                                                    ? "bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700"
                                                    : "bg-primary/10 hover:bg-primary/20",
                                            )}
                                        >
                                            <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                                            <span className="sr-only sm:not-sr-only sm:inline">网络检索</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>网络检索功能 {webSearch ? '已开启' : '已关闭'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>

                    {/* 右侧区域：功能按钮和发送按钮 */}
                    <div className="flex items-center gap-0.5 sm:gap-2">
                        {/* 隐藏的文件输入框 */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            multiple
                        />

                        {/* 隐藏的图片输入框 */}
                        <input
                            type="file"
                            ref={imageInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                            multiple
                        />

                        {/* 文件上传按钮 */}
                        {enableFileUpload && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-auto aspect-square min-h-[2.5vh] sm:min-h-[3.5vh] rounded-md sm:rounded-xl shrink-0 bg-primary/10 hover:bg-primary/20"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isLoading || isStreaming}
                                        >
                                            <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>上传文件</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {/* 图片上传按钮 */}
                        {enableImageUpload && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-auto aspect-square min-h-[2.5vh] sm:min-h-[3.5vh] rounded-md sm:rounded-xl shrink-0 bg-primary/10 hover:bg-primary/20"
                                            onClick={() => imageInputRef.current?.click()}
                                            disabled={isLoading || isStreaming}
                                        >
                                            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>上传图片</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {/* 发送/暂停按钮 */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={isStreaming ? handleStopClick : handleSend}
                                        size="icon"
                                        className={cn(
                                            "h-auto aspect-square min-h-[2.5vh] sm:min-h-[3.5vh] rounded-md sm:rounded-xl shrink-0",
                                            isStreaming
                                                ? "bg-red-100 hover:bg-red-200 text-red-600 border border-red-300"
                                                : "bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary"
                                        )}
                                        disabled={(!isStreaming && (isLoading || (!input.trim() && files.length === 0 && imageFiles.length === 0)))}
                                    >
                                        {isLoading && !isStreaming ? (
                                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                        ) : isStreaming ? (
                                            <PauseCircle className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
                                        ) : (
                                            <SendHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isStreaming ? "停止生成" : "发送消息"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        </div>
    );
} 