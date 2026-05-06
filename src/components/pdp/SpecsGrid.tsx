type Spec = { label: string; value: string };

export function SpecsGrid({ specs }: { specs: Spec[] }) {
  return (
    <section className="pdp-specs">
      <div className="eyebrow">Specifikationer</div>
      <div className="pdp-specs-grid">
        {specs.map((s) => (
          <div key={s.label} className="pdp-spec">
            <div className="lbl">{s.label}</div>
            <div className="val">{s.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
