import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ResultView } from './components/ResultView';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { analyzeEvent } from './services/geminiService';
import { AnalysisResult, LoadingState, AnalysisMode } from './types';
import { AlertCircle, Zap } from 'lucide-react';

type PageView = 'home' | 'privacy' | 'terms';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<AnalysisMode>('deep');
  const [currentPage, setCurrentPage] = useState<PageView>('home');

  const handleSearch = async (query: string, mode: AnalysisMode) => {
    setStatus(LoadingState.SEARCHING);
    setErrorMsg('');
    setResult(null);
    setCurrentMode(mode);

    try {
      const data = await analyzeEvent(query, mode);
      setResult(data);
      setStatus(LoadingState.COMPLETE);
    } catch (err) {
      console.error(err);
      setErrorMsg(t('error.message'));
      setStatus(LoadingState.ERROR);
    }
  };

  const navigateTo = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // 渲染隐私政策页面
  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => navigateTo('home')} />;
  }

  // 渲染使用条款页面
  if (currentPage === 'terms') {
    return <TermsOfService onBack={() => navigateTo('home')} />;
  }

  // 渲染主页面
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 selection:bg-blue-500/30 flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <Header />

      <main className="relative container mx-auto px-4 sm:px-6 py-4 md:py-8 flex-grow">
        {status === LoadingState.IDLE && (
          <div className="animate-in fade-in zoom-in duration-700 mt-2 md:mt-4 lg:mt-8">
            <SearchBar onSearch={handleSearch} isLoading={false} />
          </div>
        )}

        {status === LoadingState.SEARCHING && (
          <div className="w-full max-w-3xl mx-auto text-center py-12 md:py-20 space-y-4 md:space-y-6 animate-in fade-in duration-500">
            <div className="relative mx-auto w-16 h-16 md:w-24 md:h-24">
               <div className={`absolute inset-0 border-t-4 border-solid rounded-full animate-spin ${currentMode === 'fast' ? 'border-amber-500' : 'border-blue-500'}`}></div>
               <div className={`absolute inset-2 border-b-4 border-solid rounded-full animate-spin reverse ${currentMode === 'fast' ? 'border-orange-500' : 'border-purple-500'}`}></div>
            </div>
            <h3 className="text-xl md:text-2xl font-medium text-slate-200">
              {currentMode === 'fast' ? t('loading.fastScanning') : t('loading.deepAnalyzing')}
            </h3>
            <p className="text-sm md:text-base text-slate-400">{t('loading.queryingSource')}</p>
          </div>
        )}

        {status === LoadingState.ERROR && (
          <div className="w-full max-w-2xl mx-auto text-center animate-in shake duration-300 mt-6 md:mt-10 px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-500/10 text-red-500 mb-4 md:mb-6">
              <AlertCircle className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{t('error.title')}</h3>
            <p className="text-sm md:text-base text-slate-400 mb-6 md:mb-8">{errorMsg}</p>
            <button 
              onClick={() => setStatus(LoadingState.IDLE)}
              className="px-5 md:px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm md:text-base"
            >
              {t('error.retry')}
            </button>
          </div>
        )}

        {status === LoadingState.COMPLETE && result && (
          <div className="space-y-6 md:space-y-8 lg:space-y-12">
             <div className="flex justify-center">
               <button 
                  onClick={() => setStatus(LoadingState.IDLE)}
                  className="text-xs md:text-sm text-slate-500 hover:text-white transition-colors flex items-center gap-2 px-3 md:px-4 py-2 rounded-full hover:bg-slate-800/50"
                >
                  {t('result.backToSearch')}
                </button>
             </div>
            <ResultView data={result} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 md:py-6 text-center relative z-10 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm mt-auto">
        <div className="flex flex-col items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 text-slate-400 opacity-80 hover:opacity-100 transition-opacity">
            <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
            <span className="text-xs md:text-sm font-medium tracking-wide">{t('footer.poweredBy')}</span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-600 font-medium">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          {/* 隐私政策和使用条款链接 */}
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs">
            <button 
              onClick={() => navigateTo('privacy')}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t('footer.privacyPolicy')}
            </button>
            <span className="text-slate-700">•</span>
            <button 
              onClick={() => navigateTo('terms')}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t('footer.termsOfService')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
