interface InlineSpinnerProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

const InlineSpinner = ({
  label = "Loading...",
  compact = false,
  className = "",
}: InlineSpinnerProps) => (
  <span className={`inline-flex min-w-0 items-center gap-2 text-sm text-fg-secondary ${className}`}>
    <span className="h-2 w-2 shrink-0 animate-ping rounded-full bg-primary" />
    {compact ? null : (
      <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
    )}
  </span>
);

export default InlineSpinner;
