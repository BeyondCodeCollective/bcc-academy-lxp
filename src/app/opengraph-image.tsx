import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Beyond Code Collective — Where everyone builds together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = (...p: string[]) => join(process.cwd(), "public", ...p);

export default async function OGImage() {
  const [photo, archivoBold, archivoSemiBold] = await Promise.all([
    readFile(asset("images", "bcc", "og-students.jpg")),
    readFile(asset("fonts", "archivo", "Archivo-Bold.ttf")),
    readFile(asset("fonts", "archivo", "Archivo-SemiBold.ttf")),
  ]);

  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}>
        <img
          src={photoSrc}
          width={size.width}
          height={size.height}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        {/* Scrim: keeps the type legible against the sky without dulling the faces. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            display: "flex",
            background:
              "linear-gradient(160deg, rgba(20,20,22,0.86) 0%, rgba(20,20,22,0.50) 30%, rgba(20,20,22,0.08) 52%, rgba(20,20,22,0) 66%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: 64,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 12, height: 12, background: "#E5F701" }} />
            <p
              style={{
                fontFamily: "Archivo",
                fontWeight: 600,
                fontSize: 19,
                color: "#ffffff",
                letterSpacing: 4,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Beyond Code Collective
            </p>
          </div>
          <p
            style={{
              fontFamily: "Archivo",
              fontWeight: 700,
              fontSize: 68,
              color: "#ffffff",
              lineHeight: 1.08,
              letterSpacing: -1.6,
              maxWidth: 860,
              margin: "26px 0 0 0",
            }}
          >
            Where everyone builds together
          </p>
          <p
            style={{
              fontFamily: "Archivo",
              fontWeight: 600,
              fontSize: 24,
              color: "rgba(255,255,255,0.88)",
              margin: "22px 0 0 0",
            }}
          >
            Ages 7 to 77 · bccacademy.io
          </p>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: archivoBold, weight: 700, style: "normal" },
        { name: "Archivo", data: archivoSemiBold, weight: 600, style: "normal" },
      ],
    },
  );
}
