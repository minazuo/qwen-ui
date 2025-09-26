'use client';

export default function ModelsPage() {
  const models = [
    {
      name: 'GPT-4o-mini',
      description: '轻量级版本，快速响应，适合日常对话',
      category: 'OpenAI',
      capabilities: ['文本生成', '对话交流', '代码辅助'],
      speed: '快速',
      quality: '高',
      cost: '低',
      status: 'active'
    },
    {
      name: 'GPT-4',
      description: '最强大的多模态模型，支持图片理解',
      category: 'OpenAI',
      capabilities: ['文本生成', '图片理解', '代码生成', '复杂推理'],
      speed: '中等',
      quality: '极高',
      cost: '高',
      status: 'available'
    },
    {
      name: 'Claude 3.5 Sonnet',
      description: 'Anthropic最新模型，擅长分析和写作',
      category: 'Anthropic',
      capabilities: ['文本分析', '创意写作', '数据处理'],
      speed: '快速',
      quality: '极高',
      cost: '中等',
      status: 'available'
    },
    {
      name: '通义千问-Plus',
      description: '阿里巴巴自研大模型，中文理解优秀',
      category: '阿里云',
      capabilities: ['中文对话', '文档处理', '知识问答'],
      speed: '快速',
      quality: '高',
      cost: '低',
      status: 'available'
    },
    {
      name: '文心一言',
      description: '百度自研大模型，综合能力强',
      category: '百度',
      capabilities: ['文本生成', '知识问答', '创意创作'],
      speed: '快速',
      quality: '高',
      cost: '低',
      status: 'available'
    },
    {
      name: 'Gemini Pro',
      description: 'Google最新多模态模型',
      category: 'Google',
      capabilities: ['多模态理解', '代码生成', '数学推理'],
      speed: '快速',
      quality: '极高',
      cost: '中等',
      status: 'coming-soon'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">使用中</span>;
      case 'available':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">可用</span>;
      case 'coming-soon':
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 rounded-full">即将推出</span>;
      default:
        return null;
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case '快速': return 'text-green-600 dark:text-green-400';
      case '中等': return 'text-yellow-600 dark:text-yellow-400';
      case '慢': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case '极高': return 'text-purple-600 dark:text-purple-400';
      case '高': return 'text-blue-600 dark:text-blue-400';
      case '中等': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case '低': return 'text-green-600 dark:text-green-400';
      case '中等': return 'text-yellow-600 dark:text-yellow-400';
      case '高': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">模型管理</h1>
          <p className="text-gray-600 dark:text-gray-400">选择和管理您的AI模型</p>
        </div>

        {/* 筛选和搜索 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索模型..."
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>所有分类</option>
            <option>OpenAI</option>
            <option>Anthropic</option>
            <option>阿里云</option>
            <option>百度</option>
            <option>Google</option>
          </select>
        </div>

        {/* 模型列表 */}
        <div className="grid gap-6">
          {models.map((model, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* 模型基本信息 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {model.name}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{model.category}</span>
                    </div>
                    {getStatusBadge(model.status)}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {model.description}
                  </p>
                  
                  {/* 能力标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {model.capabilities.map((capability, capIndex) => (
                      <span
                        key={capIndex}
                        className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 模型参数 */}
                <div className="lg:w-80">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">响应速度</p>
                      <p className={`font-semibold ${getSpeedColor(model.speed)}`}>{model.speed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">输出质量</p>
                      <p className={`font-semibold ${getQualityColor(model.quality)}`}>{model.quality}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">使用成本</p>
                      <p className={`font-semibold ${getCostColor(model.cost)}`}>{model.cost}</p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    {model.status === 'active' ? (
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                        使用中
                      </button>
                    ) : model.status === 'available' ? (
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                        选择使用
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed"
                      >
                        即将推出
                      </button>
                    )}
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      详情
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部说明 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">模型选择建议</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-300">
            <div>
              <p className="font-medium mb-1">日常对话：</p>
              <p>推荐使用 GPT-4o-mini 或通义千问-Plus，响应快速且成本较低</p>
            </div>
            <div>
              <p className="font-medium mb-1">复杂任务：</p>
              <p>推荐使用 GPT-4 或 Claude 3.5 Sonnet，能力更强，质量更高</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}