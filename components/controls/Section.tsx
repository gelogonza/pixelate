"use client";

interface Props {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: Props) {
  return (
    <section className="space-y-3 pb-4 mb-4 border-b border-white/5">
      <h3 className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-medium">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
