import { NextRequest, NextResponse } from "next/server";
import { submitYambolyAnswer } from "@/lib/yamboly-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token || req.cookies.get("yamboly_token")?.value;
    const { questionId, selectedOptionId } = body;

    if (!token) {
      return NextResponse.json(
        { error: "No se identificó al participante. Por favor vuelve a ingresar." },
        { status: 401 }
      );
    }

    if (!questionId || !selectedOptionId) {
      return NextResponse.json(
        { error: "Datos de respuesta incompletos." },
        { status: 400 }
      );
    }

    const result = await submitYambolyAnswer({
      token,
      questionId: Number(questionId),
      selectedOptionId: String(selectedOptionId),
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Error in /api/yamboly/answer:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar respuesta" },
      { status: 400 }
    );
  }
}
