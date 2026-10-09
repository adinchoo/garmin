type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
};

export default function SectionHeader({ eyebrow, title, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
