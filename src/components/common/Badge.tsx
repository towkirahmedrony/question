import React from 'react';
import type { DifficultyLevel, SourceType } from '../../types/question';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-medium px-3 py-1.5',
  };

  const variantClasses = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    purple: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    amber: 'bg-orange-50 text-orange-700 border border-orange-200/80',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="inline-block shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export const DifficultyBadge: React.FC<{ level: DifficultyLevel; label?: string }> = ({
  level,
  label,
}) => {
  const map: Record<DifficultyLevel, { variant: 'success' | 'warning' | 'danger'; defaultLabel: string }> = {
    easy: { variant: 'success', defaultLabel: 'Easy' },
    medium: { variant: 'warning', defaultLabel: 'Medium' },
    hard: { variant: 'danger', defaultLabel: 'Hard' },
  };

  const item = map[level] || map.medium;
  return <Badge variant={item.variant}>{label || item.defaultLabel}</Badge>;
};

export const SourceTypeBadge: React.FC<{ type: SourceType; label?: string }> = ({
  type,
  label,
}) => {
  const map: Record<SourceType, { variant: 'purple' | 'info' | 'amber' | 'neutral'; defaultLabel: string }> = {
    board_exam: { variant: 'purple', defaultLabel: 'Board Exam' },
    admission: { variant: 'info', defaultLabel: 'Admission' },
    school: { variant: 'amber', defaultLabel: 'School / College' },
    other: { variant: 'neutral', defaultLabel: 'Other' },
  };

  const item = map[type] || map.other;
  return <Badge variant={item.variant}>{label || item.defaultLabel}</Badge>;
};

export const MockTagBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
      Phase 1 Mock
    </span>
  );
};
