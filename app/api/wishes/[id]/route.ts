import { getWishService } from "@/features/container";
import { UpdateWishInputSchema } from "@/features/wishes/schema";
import { assertSameOrigin, toErrorResponse } from "@/shared/server/http";
import { requireSession } from "@/shared/server/session-next";
import { parseBody } from "../parse-body";

/** `PATCH /api/wishes/[id]` (F6, F8, F9): cambia los campos enviados y responde 200 con el deseo completo. */
export async function PATCH(request: Request, context: RouteContext<"/api/wishes/[id]">): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await context.params;
    const input = await parseBody(request, UpdateWishInputSchema);
    const wish = await getWishService().update(session.uid, id, input);
    return Response.json(wish);
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `DELETE /api/wishes/[id]` (F7): elimina el deseo y responde 204. */
export async function DELETE(request: Request, context: RouteContext<"/api/wishes/[id]">): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await context.params;
    await getWishService().remove(session.uid, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
