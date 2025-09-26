export default function Welcome() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            你好！我是小数小科
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            有什么可以帮助您的吗？
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            请在下方输入框中输入您的问题
          </div>
        </div>
      </div>
    </div>
  );
}
