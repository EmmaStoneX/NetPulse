import React from 'react';
import { Activity } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-4 md:px-8 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">NetPulse</h1>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">事件视界</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-400">
        <span>实时分析</span>
        <span>•</span>
        <span>搜索增强已启用</span>
      </div>
    </header>
  );
};