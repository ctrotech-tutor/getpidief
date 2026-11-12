import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const title       = searchParams.get("title")       ?? "getpidief";
  const institution = searchParams.get("institution")  ?? "";
  const category    = searchParams.get("category")     ?? "";
  const type        = searchParams.get("type")         ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width:           "100%",
          height:          "100%",
          display:         "flex",
          flexDirection:   "column",
          justifyContent:  "space-between",
          padding:         "60px",
          background:      "linear-gradient(135deg, #060C19 0%, #0C1428 60%, #111D3A 100%)",
          fontFamily:      "sans-serif",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#F1F5F9", fontSize: "24px", fontWeight: 800, letterSpacing: "-1px" }}>
            getpidief
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
            Academic Resource Network
          </span>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{
            color:       "#F1F5F9",
            fontSize:    title.length > 60 ? "36px" : "48px",
            fontWeight:  700,
            lineHeight:  1.2,
            letterSpacing: "-0.02em",
            maxWidth:    "800px",
            margin:      0,
          }}>
            {title.slice(0, 100)}
          </p>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {institution && (
              <span style={{
                background:  "rgba(37,99,235,0.2)",
                border:      "1px solid rgba(37,99,235,0.4)",
                color:       "#60A5FA",
                fontSize:    "14px",
                padding:     "6px 14px",
                borderRadius:"999px",
              }}>
                {institution}
              </span>
            )}
            {category && (
              <span style={{
                background:  "rgba(245,158,11,0.15)",
                border:      "1px solid rgba(245,158,11,0.3)",
                color:       "#F59E0B",
                fontSize:    "14px",
                padding:     "6px 14px",
                borderRadius:"999px",
              }}>
                {category}
              </span>
            )}
            {type && (
              <span style={{
                background:  "rgba(255,255,255,0.07)",
                color:       "#8B9CC4",
                fontSize:    "13px",
                padding:     "6px 14px",
                borderRadius:"999px",
              }}>
                {type.replace(/_/g, " ").toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          display:     "flex",
          alignItems:  "center",
          gap:         "8px",
          color:       "rgba(255,255,255,0.3)",
          fontSize:    "13px",
        }}>
          <span>🎓</span>
          <span>getpidief.me - The Archive That Thinks.</span>
        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
    }
  );
}