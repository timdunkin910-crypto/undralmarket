export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Ачаалж байна">
      <div className="h-32 animate-pulse rounded-3xl bg-mint-soft" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-mint-soft" />
        ))}
      </div>
    </div>
  );
}
