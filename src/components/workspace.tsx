import type { LucideIcon } from "lucide-react";

export type WorkspaceStat = {
  label: string;
  value: string | number;
  hint?: string;
  Icon: LucideIcon;
};

export function WorkspaceHero({
  eyebrow,
  title,
  subtitle,
  stats,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stats: WorkspaceStat[];
  actions?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap">{actions}</div>}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, hint, Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-muted/40 p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold tabular-nums">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
