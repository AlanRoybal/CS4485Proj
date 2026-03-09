import { MOCK_HISTORY } from '@/lib/mock-data'

export async function POST(_req: Request) {
  // Phase 1: returns mock data
  // Phase 3: replace with fetch to MODAL_HISTORY_URL
  return Response.json(MOCK_HISTORY)
}
