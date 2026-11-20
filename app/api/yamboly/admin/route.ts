import { NextRequest, NextResponse } from "next/server";
import { executeModeratorAction } from "@/lib/yamboly-db";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const isUserAdmin = await isAdmin();

    if (!isUserAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Debes iniciar sesión como administrador en /login." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action || !action.type) {
      return NextResponse.json(
        { error: "Acción no especificada." },
        { status: 400 }
      );
    }

    const session = await executeModeratorAction(action);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error("Error in /api/yamboly/admin:", error);
    return NextResponse.json(
      { error: error.message || "Error al ejecutar acción de moderador" },
      { status: 500 }
    );
  }
}
