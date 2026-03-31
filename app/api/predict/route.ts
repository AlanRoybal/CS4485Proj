import { fetchPrediction } from '@/lib/api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { zipcode, bedrooms } = body as { zipcode?: string; bedrooms?: number }

    if (!zipcode || !/^\d{5}$/.test(zipcode)) {
      return Response.json({ error: 'zipcode must be a 5-digit string' }, { status: 400 })
    }
    if (!bedrooms || ![2, 3, 4, 5].includes(bedrooms)) {
      return Response.json({ error: 'bedrooms must be 2, 3, 4, or 5' }, { status: 400 })
    }

    const result = await fetchPrediction(zipcode, bedrooms)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('not configured')) {
      return Response.json({ error: 'Backend not configured' }, { status: 503 })
    }
    if (message.includes('not found')) {
      return Response.json({ error: message }, { status: 404 })
    }
    return Response.json({ error: message }, { status: 502 })
  }
}
