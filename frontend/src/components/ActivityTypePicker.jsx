import { Search } from "lucide-react";

import { getActivityIcon } from "../utils/iconMap";

export function ActivityTypePicker({
  activityTypes,
  query,
  selectedId,
  onQueryChange,
  onSelect,
}) {
  const filtered = activityTypes.filter((item) => {
    const haystack = `${item.name} ${item.category}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <label className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="h-4 w-4 text-textMuted" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="w-full bg-transparent text-sm text-textPrimary placeholder:text-textMuted focus:outline-none"
          placeholder="Search running, yoga, boxing..."
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((item) => {
          const Icon = getActivityIcon(item.icon_name);
          const selected = selectedId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`rounded-3xl border p-4 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-surface/60 hover:border-secondary/40"
              }`}
            >
              <Icon className="h-6 w-6 text-secondary" />
              <p className="mt-4 font-semibold">{item.name}</p>
              <p className="text-sm capitalize text-textMuted">{item.category}</p>
              <p className="mt-2 text-xs text-accent">MET {item.met_value}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
