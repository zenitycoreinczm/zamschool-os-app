type SectionIntroProps = {
  title: string;
  description: string;
};

export function SectionIntro({ title, description }: SectionIntroProps) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-workspace-muted">{description}</p>
    </div>
  );
}