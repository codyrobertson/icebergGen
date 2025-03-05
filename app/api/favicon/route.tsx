export const runtime = "nodejs"

export async function GET() {
  // Create a simple SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" fill="#1e90ff" />
      <text x="16" y="22" fontFamily="Arial" fontSize="20" textAnchor="middle" fill="white">🧊</text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

