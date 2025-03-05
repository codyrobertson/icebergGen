export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query") || "Iceberg.AI"

  // Create a simple SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#1e90ff" />
      <text x="600" y="300" fontFamily="Arial" fontSize="80" textAnchor="middle" fill="white" fontWeight="bold">Iceberg.AI</text>
      <text x="600" y="400" fontFamily="Arial" fontSize="40" textAnchor="middle" fill="white">${query}</text>
    </svg>
  `

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

