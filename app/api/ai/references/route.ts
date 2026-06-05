import { NextRequest, NextResponse } from 'next/server'
import { loadMeta, removeReference } from '@/lib/ai/references-store'

export async function GET() {
  const refs = loadMeta()
  return NextResponse.json(refs)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  removeReference(id)
  return NextResponse.json({ ok: true })
}
