import { NextRequest, NextResponse } from "next/server";
import { registerYambolyParticipant } from "@/lib/yamboly-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone } = body;

    if (typeof fullName !== "string" || typeof email !== "string" || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Por favor completa todos los campos requeridos." },
        { status: 400 }
      );
    }

    const participant = await registerYambolyParticipant({
      fullName,
      email,
      phone,
    });

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
  } catch (error: any) {
    console.error("Error in /api/yamboly/register:", error);
    return NextResponse.json(
      { error: error.message || "Error al registrar participante" },
      { status: 400 }
    );
  }
}
