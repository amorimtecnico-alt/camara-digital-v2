type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="text-sm text-foreground/70">{description}</p>
    </header>
  );
}
