import { CreateSessionInputSchema } from "@/features/accounts/schema";
import { getAccountService } from "@/features/container";
import { assertSameOrigin, rejectInvalidJson, toErrorResponse } from "@/shared/server/http";

/** `POST /api/session` (F2, regla 13): cambia el `id_token` por la cookie de sesión. 204 sin cuerpo. */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const input = CreateSessionInputSchema.parse(await request.json().catch(rejectInvalidJson));
    await getAccountService().startSession(input);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `DELETE /api/session` (F2, reglas 16–18): cierra la sesión. No lee el cuerpo; el uid sale de la cookie. */
export async function DELETE(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    await getAccountService().endSession();
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
