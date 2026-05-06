export function StoryBand({ gradient, name, body }: { gradient: string | null; name: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="pdp-story" style={{ background: gradient || "var(--mist-100)" }}>
      <div className="container pdp-story-inner">
        <div className="eyebrow">Historien bag</div>
        <h2 className="pdp-story-quote">"{name} er lavet til at blive en del af din hverdag."</h2>
        <p className="pdp-story-body">{body}</p>
      </div>
    </section>
  );
}
