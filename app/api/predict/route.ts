import { MOCK_PREDICTION } from '@/lib/mock-data'

export async function POST(_req: Request) {
  // Phase 1: returns mock data
  // Phase 3: replace with:
  //   const body = await req.json()
  //   const res = await fetch(process.env.MODAL_PREDICT_URL!, {
  //     method: 'POST', headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(body),
  //   })
  //   return Response.json(await res.json())
  return Response.json(MOCK_PREDICTION)
}
