'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Compass, 
  Briefcase, 
  Cpu, 
  User,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MainSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  // 确保客户端渲染标志
  useEffect(() => {
    setIsClient(true);
  }, []);

  const tabs = [
    {
      id: 'chat',
      name: '对话',
      path: '/chat',
      icon: MessageCircle
    },
    {
      id: 'discover',
      name: '发现',
      path: '/discover',
      icon: Compass
    },
    {
      id: 'workspace',
      name: '工作台',
      path: '/workspace',
      icon: Briefcase
    },
    {
      id: 'models',
      name: '模型',
      path: '/models',
      icon: Cpu
    }
  ];

  const handleTabClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="w-20 flex flex-col items-center py-6">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg">
          <Sparkles className="w-7 h-7" />
        </div>
      </div>

      {/* 导航标签 */}
      <nav className="flex-1 flex flex-col gap-4">
        {tabs.map((tab) => {
          const isActive = isClient && pathname === tab.path;
          const IconComponent = tab.icon;
          
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "ghost"}
              size="icon"
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                "group relative w-12 h-12 rounded-xl transition-all duration-200",
                isActive && "bg-primary/10 text-primary hover:bg-primary/20",
                !isActive && "text-muted-foreground hover:text-foreground"
              )}
            >
              <IconComponent className="w-7 h-7" />
              
              {/* 工具提示 */}
              <div className="absolute left-16 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-md border">
                {tab.name}
                <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-popover border-l border-t rotate-45"></div>
              </div>
            </Button>
          );
        })}
      </nav>

      {/* 用户头像/设置 */}
      <div className="mt-auto">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
        >
          <User className="w-7 h-7" />
        </Button>
      </div>
    </div>
  );
}