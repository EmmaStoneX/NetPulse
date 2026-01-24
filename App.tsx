import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ResultView } from './components/ResultView';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { ShareButton } from './components/ShareButton';
import { ShareModal } from './components/ShareModal';
import { SharedView } from './components/SharedView';
import { analyzeEvent } from './services/geminiService';
import { AnalysisResult, LoadingState, AnalysisMode } from './types';
import {
  isShareUrl,
  getShareDataFromCurrentUrl,
  getShortShareId,
  fetchShareData,
  SharedAnalysisData
} from './utils/shareUtils';
import { cn } from './utils/cn';
import { AlertCircle, Zap, ArrowLeft, Share2, Home } from 'lucide-react';
import ParticleBackground from './components/ParticleBackground';

type PageView = 'home' | 'privacy' | 'terms' | 'shared' | 'shared-error';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<AnalysisMode>('deep');
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharedData, setSharedData] = useState<SharedAnalysisData | null>(null);
  const [isLoadingShare, setIsLoadingShare] = useState(false);

  // Handle URL hash changes for share links
  useEffect(() => {
    const handleHashChange = async () => {
      if (isShareUrl()) {
        const shortId = getShortShareId();
        if (shortId) {
          setIsLoadingShare(true);
          setCurrentPage('shared');
          const data = await fetchShareData(shortId);
          setIsLoadingShare(false);
          if (data) {
            setSharedData(data);
          } else {
            setCurrentPage('shared-error');
          }
        } else {
          const data = getShareDataFromCurrentUrl();
          if (data) {
            setSharedData(data);
            setCurrentPage('shared');
          } else {
            setCurrentPage('shared-error');
          }
        }
      } else if (window.location.hash === '' || window.location.hash === '#/') {
        if (currentPage === 'shared' || currentPage === 'shared-error') {
          setCurrentPage('home');
          setSharedData(null);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentPage]);

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentPage('home');
    setSharedData(null);
    setStatus(LoadingState.IDLE);
    window.scrollTo(0, 0);
  };

  const handleSearch = async (query: string, mode: AnalysisMode) => {
    setStatus(LoadingState.SEARCHING);
    setErrorMsg('');
    setResult(null);
    setCurrentMode(mode);
    setCurrentQuery(query);

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

  const handleBackToSearch = () => {
    setStatus(LoadingState.IDLE);
    window.scrollTo(0, 0);
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };



  // Footer component
  const Footer = ({ className }: { className?: string }) => (
    <footer className={cn(
      "w-full py-3 md:py-4 text-center relative z-10",
      "border-t border-border/50 bg-background/80 backdrop-blur-md",
      className
    )}>
      <div className="flex flex-col items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2 text-muted-foreground opacity-80 hover:opacity-100 transition-opacity">
          <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
          <span className="text-xs md:text-sm font-medium tracking-wide">{t('footer.poweredBy')}</span>
        </div>
        <p className="text-[10px] md:text-xs text-muted-foreground/60 font-medium">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
        <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs">
          <button
            onClick={() => navigateTo('privacy')}
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            {t('footer.privacyPolicy')}
          </button>
          <span className="text-border">•</span>
          <button
            onClick={() => navigateTo('terms')}
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            {t('footer.termsOfService')}
          </button>
        </div>
      </div>
    </footer>
  );

  // Render shared view error page
  if (currentPage === 'shared-error') {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col">
        <ParticleBackground />
        <main className="relative container mx-auto px-4 sm:px-6 flex-1 flex items-center justify-center">
          <div className="w-full max-w-md mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-6">
              <Share2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              {t('sharedView.errorTitle')}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t('sharedView.errorDescription')}
            </p>
            <button
              onClick={navigateToHome}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              {t('sharedView.backToHome')}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Render shared view page
  if (currentPage === 'shared' && sharedData) {
    return <SharedView sharedData={sharedData} onStartNewAnalysis={navigateToHome} />;
  }

  // Render loading state for share data
  if (currentPage === 'shared' && isLoadingShare) {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col">
        <ParticleBackground />
        <main className="relative container mx-auto px-4 sm:px-6 flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-spin" />
            </div>
            <p className="mt-4 text-muted-foreground">{t('sharedView.loading')}</p>
          </div>
        </main>
      </div>
    );
  }

  // 渲染隐私政策页面
  if (currentPage === 'privacy') {
    return <PrivacyPolicy onBack={() => navigateTo('home')} />;
  }

  // 渲染使用条款页面
  if (currentPage === 'terms') {
    return <TermsOfService onBack={() => navigateTo('home')} />;
  }

  // 结果页面
  if (status === LoadingState.COMPLETE && result) {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
        <ParticleBackground />

        {/* 返回按钮和分享按钮 */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <button
              onClick={handleBackToSearch}
              className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/50"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('result.backToSearch')}
            </button>
            <ShareButton
              analysisResult={result}
              query={currentQuery}
              onShareClick={handleShareClick}
            />
          </div>
        </div>

        {/* 结果内容 */}
        <main className="relative container mx-auto px-4 sm:px-6 py-6">
          <ResultView data={result} />
        </main>

        {/* Share Modal */}
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          analysisResult={result}
          query={currentQuery}
        />

        <Footer />
      </div>
    );
  }

  // 首页/加载/错误页面
  return (
    <div className="h-screen text-foreground selection:bg-primary/30 flex flex-col overflow-hidden">
      <ParticleBackground />
      <Header isLoading={status === LoadingState.SEARCHING} />

      <main className="relative container mx-auto px-4 sm:px-6 flex-1 flex items-center justify-center overflow-y-auto">
        {status === LoadingState.IDLE && (
          <div className="animate-fade-in w-full">
            <SearchBar onSearch={handleSearch} isLoading={false} />
          </div>
        )}

        {status === LoadingState.SEARCHING && (
          <div className="w-full max-w-3xl mx-auto text-center space-y-4 md:space-y-6 animate-fade-in">
            <div className="relative mx-auto w-16 h-16 md:w-24 md:h-24">
              <div className={cn(
                "absolute inset-0 border-t-4 border-solid rounded-full animate-spin",
                currentMode === 'fast' ? 'border-amber-500' : 'border-primary'
              )} />
              <div className={cn(
                "absolute inset-2 border-b-4 border-solid rounded-full animate-spin",
                currentMode === 'fast' ? 'border-orange-500' : 'border-accent'
              )} style={{ animationDirection: 'reverse' }} />
            </div>
            <h3 className="text-xl md:text-2xl font-medium text-foreground">
              {currentMode === 'fast' ? t('loading.fastScanning') : t('loading.deepAnalyzing')}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground">{t('loading.queryingSource')}</p>
          </div>
        )}

        {status === LoadingState.ERROR && (
          <div className="w-full max-w-2xl mx-auto text-center animate-fade-in px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-destructive/10 text-destructive mb-4 md:mb-6">
              <AlertCircle className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{t('error.title')}</h3>
            <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">{errorMsg}</p>
            <button
              onClick={() => setStatus(LoadingState.IDLE)}
              className="px-5 md:px-6 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors text-sm md:text-base"
            >
              {t('error.retry')}
            </button>
          </div>
        )}
      </main>

      <Footer className="shrink-0" />
    </div>
  );
};

export default App;
