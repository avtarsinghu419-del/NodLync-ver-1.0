import { normalizeGeneratedText } from "../utils/generatedText";

interface GeneratedTextProps {
  text: string | null | undefined;
  className?: string;
}

const GeneratedText = ({ text, className = "" }: GeneratedTextProps) => {
  const normalized = normalizeGeneratedText(text);

  if (!normalized) {
    return null;
  }

  const paragraphs = normalized.split(/\n{2,}/).filter(Boolean);

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`} className="whitespace-pre-wrap break-words">
          {paragraph}
        </p>
      ))}
    </div>
  );
};

export default GeneratedText;
