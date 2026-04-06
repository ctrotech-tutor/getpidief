export default function HomePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        gap: "16px",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2rem, 6vw, 4rem)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
        }}
      >
        getpidief
      </h1>
      <p
        style={{
          fontSize: "1rem",
          opacity: 0.5,
          fontWeight: 500,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        The Academic Resource Network — Coming Soon
      </p>
    </main>
  );
}
