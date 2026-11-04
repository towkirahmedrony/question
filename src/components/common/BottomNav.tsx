import React from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import type { ImporterTab } from '../../types/navigation';
import { LayoutDashboard, UploadCloud, Edit3, CheckCircle2, History } from 'lucide-react';

interface BottomNavProps {
  currentTab: ImporterTab;
  onSelectTab: (tab: ImporterTab) => void;
  questionCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  questionCount,
}) => {
  const { t } = useLanguage();

  const itemClass = (tab: ImporterTab): string =>
    `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
      currentTab === tab ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 pt-1.5 shadow-lg"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.375rem)' }}
    >
      <div className="flex items-center justify-around">
        <button onClick={() => onSelectTab('dashboard')} className={itemClass('dashboard')}>
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">{t.nav_dashboard}</span>
        </button>

        <button onClick={() => onSelectTab('upload')} className={itemClass('upload')}>
          <UploadCloud className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">{t.nav_upload}</span>
        </button>

        <button onClick={() => onSelectTab('review')} className={itemClass('review')}>
          <div className="relative">
            <Edit3 className="w-5 h-5 mb-0.5" />
            {questionCount > 0 && (
              <span className="absolute -top-1 -right-2.5 w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {questionCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight">{t.nav_review}</span>
        </button>

        <button onClick={() => onSelectTab('summary')} className={itemClass('summary')}>
          <CheckCircle2 className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">{t.nav_summary}</span>
        </button>

        <button onClick={() => onSelectTab('history')} className={itemClass('history')}>
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">{t.nav_history}</span>
        </button>
      </div>
    </nav>
  );
};
