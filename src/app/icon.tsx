import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#E4F800",
          borderRadius: "4px",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: 900,
            color: "#0A0A0A",
            letterSpacing: "-1px",
            lineHeight: 1,
          }}
        >
          [ ]
        </span>
      </div>
    ),
    { ...size }
  );
}
