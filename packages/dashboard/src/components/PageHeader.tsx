import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useBreakpoint } from '../useBreakpoint';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  const { isMobile } = useBreakpoint();
  return (
    <header className="flex flex-col gap-1 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-black text-strong tracking-tight mt-1 flex items-center gap-2">
          <Icon className="text-primary h-5 w-5 md:h-6 md:w-6 shrink-0" />
          {title}
        </h2>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 md:ml-auto">
            {actions}
          </div>
        )}
      </div>
      {!isMobile && (
        <p className="text-sm text-neutral mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      )}
    </header>
  );
}
