import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function SectionCard({
  title,
  subtitle,
  actions,
  children
}: SectionCardProps) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">{title}</p>
          {subtitle ? <h2>{subtitle}</h2> : null}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
