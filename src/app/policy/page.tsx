export default function PolicyPage() {
  const items = [
    { title: "Senate advances budget deal", tldr: "Spending bill progress reduces near-term shutdown risk.", src: "Sample" },
    { title: "Trade talks resume", tldr: "Tariff path remains uncertain for consumer goods.", src: "Sample" },
    { title: "Fed speaker calendar", tldr: "Chair remarks later this week.", src: "Sample" },
  ];
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8">
        <div className="glass rounded-xl border border-white/10">
          <div className="px-4 md:px-5 pt-4 md:pt-5 pb-3 border-b border-white/10">
            <h2 className="text-sm font-semibold tracking-wide text-neutral-200">Policy & Politics</h2>
          </div>
          <div className="px-4 md:px-5 py-4">
            <ul className="space-y-4">
              {items.map((n, i) => (
                <li key={i}>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-neutral-300">{n.tldr}</div>
                  <div className="text-xs text-neutral-500">{n.src}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


