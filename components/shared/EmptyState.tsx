import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 text-navy-200 dark:text-navy-600">{icon}</div>
      <h3 className="mb-1 text-lg font-display font-semibold text-navy-800 dark:text-navy-50">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-navy-400 dark:text-navy-300">{description}</p>
      {action}
    </div>
  );
}
