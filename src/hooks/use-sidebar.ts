// /src/hooks/use-sidebar.ts
// admin-panel

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { produce } from "immer";

// 定义侧边栏设置的类型
type SidebarSettings = {
  disabled: boolean; // 是否禁用侧边栏
  isHoverOpen: boolean; // 当鼠标悬停时是否自动打开
};

// 定义侧边栏存储的状态和方法类型
type SidebarStore = {
  isOpen: boolean; // 侧边栏是否打开
  isHover: boolean; // 鼠标是否悬停在侧边栏上
  settings: SidebarSettings; // 侧边栏的设置
  toggleOpen: () => void; // 切换侧边栏的打开状态
  setIsOpen: (isOpen: boolean) => void; // 设置侧边栏的打开状态
  setIsHover: (isHover: boolean) => void; // 设置鼠标的悬停状态
  getOpenState: () => boolean; // 获取当前侧边栏是否应该显示（考虑了悬停设置）
  setSettings: (settings: Partial<SidebarSettings>) => void; // 更新侧边栏设置
};

// 创建一个持久化的侧边栏状态管理store
export const useSidebar = create(
  // 使用persist中间件来持久化store中的数据
  persist<SidebarStore>(
    (set, get) => ({
      isOpen: true, // 默认侧边栏是打开的
      isHover: false, // 默认鼠标没有悬停在侧边栏上
      settings: { disabled: false, isHoverOpen: false }, // 初始化侧边栏设置

      // 切换侧边栏的打开状态
      toggleOpen: () => {
        set({ isOpen: !get().isOpen }); // 反转当前的打开状态
      },

      // 直接设置侧边栏的打开状态
      setIsOpen: (isOpen: boolean) => {
        set({ isOpen }); // 设置新的打开状态
      },

      // 设置鼠标的悬停状态
      setIsHover: (isHover: boolean) => {
        set({ isHover }); // 设置新的悬停状态
      },

      // 获取当前侧边栏是否应该显示，考虑了悬停设置
      getOpenState: () => {
        const state = get(); // 获取当前状态
        // 如果侧边栏是打开的或者设置了悬停打开并且确实悬停着，则返回true
        return state.isOpen || (state.settings.isHoverOpen && state.isHover);
      },

      // 更新侧边栏设置
      setSettings: (settings: Partial<SidebarSettings>) => {
        set(
          produce((state: SidebarStore) => {
            state.settings = { ...state.settings, ...settings }; // 合并新旧设置
          })
        );
      }
    }),
    {
      name: "sidebar", // 持久化数据的名称
      storage: createJSONStorage(() => localStorage) // 使用localStorage作为存储介质
    }
  )
);