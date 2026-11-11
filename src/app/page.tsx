export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#fafaf8",
        color: "#1a1a18",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 600, letterSpacing: "-0.05em", margin: 0 }}>
          getpidief<span style={{ color: "#85857f" }}>.</span>
        </h1>
        <p style={{ margin: "0.75rem 0 0", color: "#777770", fontSize: "0.95rem" }}>
          Something new is on the way.
        </p>
      </div>
    </main>
  );
}
