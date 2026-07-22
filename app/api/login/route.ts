import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Попълни всички полета." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Няма такъв потребител." },
        { status: 400 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Грешна парола." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Успешен вход!",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Възникна грешка." },
      { status: 500 }
    );
  }
}