import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Beyond Code Collective — Where everyone builds together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#000",
          padding: 80,
        }}
      >
        <p
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 18,
            fontWeight: 600,
            color: "#E54D2E",
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Beyond Code Collective
        </p>
        <p
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 52,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Where everyone builds together
        </p>
        <p
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 20,
            color: "#999",
            marginTop: 32,
          }}
        >
          bccacademy.io
        </p>
      </div>
    ),
    { ...size },
  );
}