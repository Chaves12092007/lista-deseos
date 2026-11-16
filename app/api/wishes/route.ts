import { getWishService } from "@/features/container";
import { CreateWishInputSchema } from "@/features/wishes/schema";
import { assertSameOrigin, toErrorResponse } from "@/shared/server/http";
import { requireSession } from "@/shared/server/session-next";
import { parseBody } from "./parse-body";

/** `POST /api/wishes` (F4): crea un deseo de la persona con sesión y responde 201 con el deseo completo. */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const input = await parseBody(request, CreateWishInputSchema);
    const wish = await getWishService().create(session.uid, input);
    return Response.json(wish, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
