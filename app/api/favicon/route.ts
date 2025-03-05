import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  // Create a canvas with a light blue gradient background
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        fontSize: 24,
        background: "linear-gradient(to bottom, #87ceeb, #1e90ff, #0000cd)",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
      }}
    >
      🧊
    </div>,
    {
      width: 32,
      height: 32,
    },
  )
}

