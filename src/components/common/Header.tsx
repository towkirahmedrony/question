import React from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { Sparkles, Globe, LayoutDashboard, UploadCloud, Edit3, CheckCircle2 } from 'lucide-react';
import { MockTagBadge } from './Badge';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: 'dashboard' | 'upload' | 'review' | 'summary') => void;
  questionCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, questionCount }) => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      {/* Phase 1 Alert Topbar */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[85%]">
          <MockTagBadge />
          <span className="font-medium text-indigo-100 hidden sm:inline">{t.phase_banner_title}:</span>
          <span className="text-indigo-200 truncate">{t.phase_banner_desc}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors text-[11px] font-semibold text-white tracking-wide"
            title="Toggle language / ভাষা পরিবর্তন করুন"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Main Nav Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">Porokh AI</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase">
                  Importer
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">{t.app_tagline}</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t.nav_dashboard}</span>
            </button>
            <button
              onClick={() => onSelectTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'upload'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t.nav_upload}</span>
            </button>
            <button
              onClick={() => onSelectTab('review')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
                currentTab === 'review'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>{t.nav_review}</span>
              {questionCount > 0 && (
                <span className="ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                  {questionCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectTab('summary')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'summary'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.nav_summary}</span>
            </button>
          </nav>

          {/* Right Action: Language Switcher on Desktop */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            >
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>{language === 'en' ? 'বাংলা (BN)' : 'English (EN)'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
