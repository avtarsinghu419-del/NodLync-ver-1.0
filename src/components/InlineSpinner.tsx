const InlineSpinner = () => (
  <div className="flex items-center gap-2 text-sm text-fg-secondary">
    <span className="h-2 w-2 animate-ping rounded-full bg-primary"></span>
    <span>Loading...</span>
  </div>
);

export default InlineSpinner;
