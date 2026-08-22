import { ImageResponse } from "next/og";

export const alt = "Werkly Consulting - IT and Non-IT recruitment partner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          color: "#f8fafc",
          background: "linear-gradient(135deg, #063f49 0%, #08717f 58%, #0b2730 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 70,
              height: 70,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              background: "#f5a742",
              color: "#073f49",
              fontSize: 38,
              fontWeight: 800,
            }}
          >
            W
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: 2 }}>WERKLY</span>
            <span style={{ fontSize: 18, letterSpacing: 6, color: "#cbe6e8" }}>
              TALENT AND TECH PARTNERS
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <span style={{ fontSize: 24, letterSpacing: 7, color: "#f5a742" }}>
            RECRUITMENT CONSULTING
          </span>
          <span style={{ marginTop: 24, fontSize: 68, fontWeight: 750, lineHeight: 1.08 }}>
            IT and Non-IT hiring built around the right fit.
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
          <span>Structured search. Clear execution. Better hiring outcomes.</span>
          <span style={{ color: "#f5a742" }}>werkly.in</span>
        </div>
      </div>
    ),
    size
  );
}

