export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-3 px-4 py-20 sm:px-6">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
        {eyebrow}
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {title}
      </h1>
      <p className="text-base leading-7 text-foreground/70">{description}</p>
    </div>
  );
}
