import { useState } from 'react';
import { Camera, Scissors, Zap, FileText, Brain, Loader2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ocrAndSummarize } from '../../../../lib/ai-service';
import { useTranslation } from '../../../../src/i18n';

interface CaptureTabProps {
  captureData: string | null;
  isCapturing: boolean;
  onSmartCapture: () => void;
}

export const CaptureTab = ({ captureData, isCapturing, onSmartCapture }: CaptureTabProps) => {
  const { t } = useTranslation();
  const [ocrText, setOcrText] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleOCRAnalysis = async () => {
    if (!captureData) return;
    
    setIsProcessing(true);
    setError('');
    setOcrText('');
    setAiSummary('');
    
    try {
      const result = await ocrAndSummarize(captureData);
      setOcrText(result.ocrText);
      setAiSummary(result.summary);
    } catch (err) {
      console.error('OCR analysis failed:', err);
      setError(err instanceof Error ? err.message : t('capture.errors.analysisFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadImage = () => {
    if (!captureData) return;
    
    try {
      // 创建下载链接
      const link = document.createElement('a');
      link.href = captureData;
      link.download = `capmind-capture-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      setError(t('capture.errors.downloadFailed'));
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Camera className="w-5 h-5 text-green-600" />
        <h2 className="text-lg font-semibold text-gray-900">{t('capture.title')}</h2>
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
          <span>{isCapturing ? t('capture.capturing') : t('capture.smartCapture')}</span>
          {!isCapturing && <Zap className="w-4 h-4" />}
        </button>
      </div>
      
      {captureData && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">{t('capture.preview')}</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img 
              src={captureData} 
              alt="Captured content" 
              className="w-full h-auto"
            />
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={handleOCRAnalysis}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('capture.analyzing')}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{t('capture.ocrAnalysis')}</span>
                </>
              )}
            </button>
            <button 
              onClick={handleDownloadImage}
              className="flex-1 flex items-center justify-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t('capture.saveImage')}</span>
            </button>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* OCR recognition results */}
          {ocrText && (
            <div className="mt-4 space-y-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <h4 className="font-medium text-gray-900">{t('capture.recognizedText')}</h4>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {ocrText}
                </div>
              </div>
              
              {/* AI summary */}
              {aiSummary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">{t('capture.aiSummary')}</h4>
                  </div>
                  <div className="prose prose-sm prose-blue max-w-none text-blue-800">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                    >
                      {aiSummary}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {!captureData && (
        <div className="text-center py-8">
          <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('capture.clickToStart')}</p>
        </div>
      )}
    </div>
  );
};