import React, { useState } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ResultView } from './components/ResultView';
import { analyzeEvent } from './services/geminiService';
import { AnalysisResult, LoadingState } from './types';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSearch = async (query: string) => {
    setStatus(LoadingState.SEARCHING);
    setErrorMsg('');
    setResult(null);

    try {
      const data = await analyzeEvent(query);
      setResult(data);
      setStatus(LoadingState.COMPLETE);
    } catch (err) {
      console.error(err);
      setErrorMsg("无法分析该事件。可能事件过于冷门或连接出现问题，请稍后重试。");
      setStatus(LoadingState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 selection:bg-blue-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <Header />

      <main className="relative container mx-auto px-4 py-12 md:py-20">
        {status === LoadingState.IDLE && (
          <div className="animate-in fade-in zoom-in duration-700">
            <SearchBar onSearch={handleSearch} isLoading={false} />
          </div>
        )}

        {status === LoadingState.SEARCHING && (
          <div className="w-full max-w-3xl mx-auto text-center py-20 space-y-6 animate-in fade-in duration-500">
            <div className="relative mx-auto w-24 h-24">
               <div className="absolute inset-0 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
               <div className="absolute inset-2 border-b-4 border-purple-500 border-solid rounded-full animate-spin reverse"></div>
            </div>
            <h3 className="text-2xl font-medium text-slate-200">正在扫描全球网络...</h3>
            <p className="text-slate-400">正在查询实时来源和历史数据库。</p>
          </div>
        )}

        {status === LoadingState.ERROR && (
          <div className="w-full max-w-2xl mx-auto text-center animate-in shake duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">分析失败</h3>
            <p className="text-slate-400 mb-8">{errorMsg}</p>
            <button 
              onClick={() => setStatus(LoadingState.IDLE)}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {status === LoadingState.COMPLETE && result && (
          <div className="space-y-12">
             <div className="flex justify-center">
               <button 
                  onClick={() => setStatus(LoadingState.IDLE)}
                  className="text-sm text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                >
                  ← 研究其他事件
                </button>
             </div>
            <ResultView data={result} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;