interface BigPicturePanelProps {
  text: string;
  bullets: string[];
}

export function BigPicturePanel({ text, bullets }: BigPicturePanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/80 leading-relaxed">{text}</p>
      <ul className="space-y-2">
        {bullets.map((bullet, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-green-400 text-xs mt-1">•</span>
            <span className="text-xs text-white/70">{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
