import { Camera, Scissors, Zap } from 'lucide-react';

interface CaptureTabProps {
  captureData: string | null;
  isCapturing: boolean;
  onSmartCapture: () => void;
}

export const CaptureTab = ({ captureData, isCapturing, onSmartCapture }: CaptureTabProps) => {
  return (
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Camera className="w-5 h-5 text-green-600" />
        <h2 className="text-lg font-semibold text-gray-900">智能截图</h2>
      </div>
      
      {/* Smart Capture Button */}
      <div className="mb-6">
        <button
          onClick={onSmartCapture}
          disabled={isCapturing}
          className={`w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-lg font-medium transition-all ${
            isCapturing
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
        >
          <Scissors className={`w-5 h-5 ${isCapturing ? 'animate-pulse' : ''}`} />
          <span>{isCapturing ? '正在截图...' : '✂️ 智能元素截图'}</span>
          {!isCapturing && <Zap className="w-4 h-4" />}
        </button>
      </div>
      
      {captureData && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">截图预览</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img 
              src={captureData} 
              alt="Captured content" 
              className="w-full h-auto"
            />
          </div>
          <div className="flex space-x-2">
            <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
              AI 分析
            </button>
            <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
              保存图片
            </button>
          </div>
        </div>
      )}
      
      {!captureData && (
        <div className="text-center py-8">
          <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">点击上方按钮开始智能截图</p>
        </div>
      )}
    </div>
  );
};