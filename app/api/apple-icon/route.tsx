export const runtime = "nodejs"

export async function GET() {
  // Create a simple SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <rect width="180" height="180" fill="#1e90ff" />
      <text x="90" y="110" fontFamily="Arial" fontSize="100" textAnchor="middle" fill="white">🧊</text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

