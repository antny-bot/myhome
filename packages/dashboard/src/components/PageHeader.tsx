import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6">
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 rounded-xl bg-primary-50 dark:bg-primary-900/30 p-2.5 text-primary-600 dark:text-primary-400">
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="text-app-title font-bold text-slate-900 dark:text-white truncate">
            {title}
          </h1>
          <p className="text-app-body-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 md:ml-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
