import { RegisterAccountInputSchema } from "@/features/accounts/schema";
import { getAccountService } from "@/features/container";
import { assertSameOrigin, rejectInvalidJson, toErrorResponse } from "@/shared/server/http";

/** `POST /api/accounts` (F1): crea la cuenta y responde 201 `{ email }` con el correo normalizado. */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const input = RegisterAccountInputSchema.parse(await request.json().catch(rejectInvalidJson));
    const output = await getAccountService().register(input);
    return Response.json({ email: output.email }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
