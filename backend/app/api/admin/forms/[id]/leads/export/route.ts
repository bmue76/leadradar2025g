// backend/app/api/admin/events/[id]/leads/export/route.ts
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await context.params;

  console.log("DEBUG: Event export route hit with id =", id);

  return new Response(
    `Event export route is alive. id=${id}`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }
  );
}
