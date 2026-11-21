import { NextRequest, NextResponse } from "next/server";
import { registerYambolyParticipant, YambolyUserError } from "@/lib/yamboly-db";

const optional = (value: unknown) => value === undefined || typeof value === "string";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { dni, fullName, email } = body ?? {};

    if (typeof dni !== "string" || !optional(fullName) || !optional(email)) {
      return NextResponse.json({ error: "Ingresa tu DNI para inscribirte." }, { status: 400 });
    }

    const participant = await registerYambolyParticipant({ dni, fullName, email });

    const response = NextResponse.json({ success: true });

    // Set cookie valid for 7 days
    response.cookies.set("yamboly_token", participant.token, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    if (error instanceof YambolyUserError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error in /api/yamboly/register:", error);
    return NextResponse.json({ error: "No se pudo completar la inscripción. Intenta nuevamente." }, { status: 500 });
  }
}
