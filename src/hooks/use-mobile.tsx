// "use client"

// import { useState, useEffect } from "react"

// export function useIsMobile() {
//     const [isMobile, setIsMobile] = useState(false)

//     useEffect(() => {
//         // 创建媒体查询
//         const mediaQuery = window.matchMedia("(max-width: 768px)")

//         // 设置初始值
//         setIsMobile(mediaQuery.matches)

//         // 创建事件监听器
//         const handleResize = (e: MediaQueryListEvent) => {
//             setIsMobile(e.matches)
//         }

//         // 添加事件监听
//         mediaQuery.addEventListener("change", handleResize)

//         // 清理函数
//         return () => {
//             mediaQuery.removeEventListener("change", handleResize)
//         }
//     }, [])

//     return isMobile
// } 