'use client';

export default function DiscoverPage() {
  const categories = [
    {
      title: 'AI 工具',
      description: '探索最新的AI工具和应用',
      items: [
        { name: '代码助手', description: '智能代码生成与优化', icon: '🤖' },
        { name: '文档写作', description: '自动化文档生成工具', icon: '📝' },
        { name: '图像生成', description: 'AI驱动的图像创作', icon: '🎨' },
        { name: '数据分析', description: '智能数据洞察分析', icon: '📊' }
      ]
    },
    {
      title: '热门模板',
      description: '精选对话模板，快速开始',
      items: [
        { name: '编程助手', description: '专业的代码开发助手', icon: '💻' },
        { name: '学习伙伴', description: '个性化学习指导', icon: '📚' },
        { name: '写作助手', description: '创意写作与文案生成', icon: '✍️' },
        { name: '商业顾问', description: '商业决策支持', icon: '💼' }
      ]
    },
    {
      title: '社区精选',
      description: '来自社区的优质内容',
      items: [
        { name: '热门对话', description: '最受欢迎的对话案例', icon: '🔥' },
        { name: '技术讨论', description: '深度技术交流', icon: '⚡' },
        { name: '创意分享', description: '创意想法与灵感', icon: '💡' },
        { name: '问题解答', description: '常见问题解决方案', icon: '❓' }
      ]
    }
  ];

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">发现</h1>
          <p className="text-gray-600 dark:text-gray-400">探索AI的无限可能，发现更多精彩内容</p>
        </div>

        {/* 搜索栏 */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="搜索工具、模板或内容..."
              className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 分类内容 */}
        <div className="space-y-12">
          {categories.map((category, categoryIndex) => (
            <section key={categoryIndex}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{category.title}</h2>
                <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  >
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 底部推荐 */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">还想要更多？</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              加入我们的社区，与其他用户分享经验，获取最新的AI资讯
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
              加入社区
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}