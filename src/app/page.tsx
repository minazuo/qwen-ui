'use client';

import { useState } from 'react';
import MainSidebar from './components/MainSidebar';
import ChatContainer from './components/ChatContainer';
import DiscoverPage from './components/DiscoverPage';
import WorkspacePage from './components/WorkspacePage';
import ModelsPage from './components/ModelsPage';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatContainer />;
      case 'discover':
        return <DiscoverPage />;
      case 'workspace':
        return <WorkspacePage />;
      case 'models':
        return <ModelsPage />;
      default:
        return <ChatContainer />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 主侧边栏 */}
      <MainSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* 主内容区域 */}
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}
