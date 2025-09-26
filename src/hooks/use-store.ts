// /src/hooks/use-store.ts
// admin-panel

import { useState, useEffect } from "react";

/**
 * 该 hook 用于修复在使用持久化（如保存到 localStorage）时可能出现的 hydration 问题。
 * Hydration 是指服务器端渲染的内容与客户端 JavaScript 执行之间同步的过程。
 * 在某些情况下，当从持久化存储（如 localStorage）中加载数据时，可能会出现不一致的情况。
 * 此 hook 确保了组件接收到的数据与持久化存储中的数据是一致的。
 */
export const useStore = <T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F
) => {
  // 调用 store 并传入 callback 来获取最新的状态值
  const result = store(callback) as F;

  // 定义一个 state 来存储最终要返回的数据
  const [data, setData] = useState<F>();

  // 使用 useEffect 来确保只有在 result 发生变化时才更新 data
  useEffect(() => {
    // 更新 state，触发组件重新渲染，并使用最新的数据
    setData(result);
  }, [result]); // 将 result 添加为依赖项，以便只在它改变时执行副作用

  // 返回当前存储的数据
  return data;
};