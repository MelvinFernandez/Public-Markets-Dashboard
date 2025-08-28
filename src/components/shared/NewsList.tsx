interface NewsItem {
  title: string;
  url: string;
  source?: string;
  summary?: string;
}

interface NewsListProps {
  items: NewsItem[];
}

export function NewsList({ items }: NewsListProps) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border-b border-white/10 pb-3 last:border-b-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:text-white transition-colors"
          >
            <h4 className="text-sm font-medium text-white/90 mb-1 line-clamp-2">
              {item.title}
            </h4>
            {item.summary && (
              <p className="text-xs text-white/60 line-clamp-2">{item.summary}</p>
            )}
            {item.source && (
              <span className="text-xs text-white/40">{item.source}</span>
            )}
          </a>
        </div>
      ))}
    </div>
  );
}
