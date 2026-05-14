export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="py-16 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">
          Who Actually Gets It Right?
        </h1>
        <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
          We track sports takes from pundits, analysts, and experts — then grade
          them when the outcome is known. No hiding, no excuses.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/submit"
            className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400 transition-colors"
          >
            Submit a Take
          </a>
          <a
            href="/takes"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-50 transition-colors"
          >
            Browse Takes
          </a>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-6 text-center">
        {[
          { label: "Takes Tracked", value: "—" },
          { label: "Experts Profiled", value: "—" },
          { label: "Graded Outcomes", value: "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-4xl font-bold text-emerald-400">{value}</p>
            <p className="mt-1 text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
