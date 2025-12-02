import React from 'react';
import { AnalysisResult } from '../types';
import { ExternalLink, History, Zap, Globe } from 'lucide-react';

interface ResultViewProps {
  data: AnalysisResult;
}

// Helper to render markdown (bold) and handle paragraphs
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  
  // Split text by newlines to handle paragraphs
  const lines = text.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="space-y-4">
      {lines.map((line, lineIdx) => {
        // Split by **bold** using lazy matching
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={lineIdx}>
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Remove asterisks and render bold
                // Added text-white and font-extrabold for better visibility
                return <strong key={partIdx} className="text-white font-extrabold">{part.slice(2, -2)}</strong>;
              }
              return <span key={partIdx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

export const ResultView: React.FC<ResultViewProps> = ({ data }) => {
  const { parsed, sources } = data;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Hero Section: Title & Summary */}
      <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Globe className="w-64 h-64 text-blue-500" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            分析完成
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            <MarkdownText text={parsed.title || "事件分析"} />
          </h2>
          
          <div className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            <MarkdownText text={parsed.summary} />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {/* Unified grid structure to ensure columns respect each other's height */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Impact Section */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Enforce fixed height for header to ensure alignment with right column */}
          <div className="flex items-center gap-3 h-10">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">核心影响</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parsed.impacts.map((impact, index) => (
              <div 
                key={index} 
                className="glass-panel p-6 rounded-2xl hover:bg-slate-800/50 transition-colors border-l-4 border-l-amber-500/50"
              >
                <div className="text-slate-300">
                  <MarkdownText text={impact} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Context Section */}
        <div className="lg:col-span-1 flex flex-col gap-6 h-full">
           {/* Enforce fixed height for header to match left column exactly */}
           <div className="flex items-center gap-3 h-10">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 flex-shrink-0">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">历史回响</h3>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col min-h-[200px]">
             <div className="text-slate-300 leading-relaxed flex-grow">
               <MarkdownText text={parsed.historicalContext} />
             </div>
             <div className="mt-6 pt-6 border-t border-slate-700/50">
               <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">历史对标</span>
             </div>
          </div>
        </div>
      </div>

      {/* Sources Section */}
      {sources.length > 0 && (
        <div className="pt-8 border-t border-slate-800">
          <h4 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            参考来源
          </h4>
          <div className="flex flex-wrap gap-3">
            {sources.map((source, idx) => (
              <a
                key={idx}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors border border-slate-700"
              >
                <span className="truncate max-w-[200px]">{source.title}</span>
                <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};