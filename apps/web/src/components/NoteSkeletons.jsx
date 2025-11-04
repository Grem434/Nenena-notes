export default function NoteSkeletons({ variant = "grid", count = 8 }) {
  const items = Array.from({ length: count });

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-2.5 sm:gap-3 pt-3">
        {items.map((_, i) => (
          <div
            key={i}
            className="h-[64px] rounded-xl border border-slate-200/70 bg-white overflow-hidden skeleton"
          >
            <div className="h-full w-full shimmer" />
          </div>
        ))}
      </div>
    );
  }

  // grid
  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className="h-[180px] rounded-2xl border border-slate-200/70 bg-white overflow-hidden skeleton"
        >
          <div className="h-full w-full shimmer" />
        </div>
      ))}
    </>
  );
}