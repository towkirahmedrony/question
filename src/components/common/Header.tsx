import React from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { ImporterTab } from '../../types/navigation';
import {
  Sparkles,
  Globe,
  LayoutDashboard,
  UploadCloud,
  Edit3,
  CheckCircle2,
  History,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  currentTab: ImporterTab;
  onSelectTab: (tab: ImporterTab) => void;
  questionCount: number;
  userEmail: string;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  questionCount,
  userEmail,
  onSignOut,
}) => {
  const { language, toggleLanguage, t } = useLanguage();

  const navButtonClass = (tab: ImporterTab): string =>
    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
      currentTab === tab
        ? 'bg-white text-indigo-700 shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      {/* Phase notice */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white text-xs px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[85%]">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-white/10 border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t.phase_banner_title}
          </span>
          <span className="text-indigo-200 truncate hidden sm:inline">{t.phase_banner_desc}</span>
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
        <div className="flex items-center justify-between h-16 gap-3">
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
            <button onClick={() => onSelectTab('dashboard')} className={navButtonClass('dashboard')}>
              <LayoutDashboard className="w-4 h-4" />
              <span>{t.nav_dashboard}</span>
            </button>
            <button onClick={() => onSelectTab('upload')} className={navButtonClass('upload')}>
              <UploadCloud className="w-4 h-4" />
              <span>{t.nav_upload}</span>
            </button>
            <button onClick={() => onSelectTab('review')} className={navButtonClass('review')}>
              <Edit3 className="w-4 h-4" />
              <span>{t.nav_review}</span>
              {questionCount > 0 && (
                <span className="ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700">
                  {questionCount}
                </span>
              )}
            </button>
            <button onClick={() => onSelectTab('summary')} className={navButtonClass('summary')}>
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.nav_summary}</span>
            </button>
            <button onClick={() => onSelectTab('history')} className={navButtonClass('history')}>
              <History className="w-4 h-4" />
              <span>{t.nav_history}</span>
            </button>
          </nav>

          {/* Account */}
          <div className="flex items-center gap-2">
            <span className="hidden lg:inline text-xs text-slate-500 max-w-[180px] truncate">
              {userEmail}
            </span>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.auth_signout}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
