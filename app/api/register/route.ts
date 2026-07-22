import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { message: "Попълни всички полета." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Потребителят вече съществува." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      message: "Успешна регистрация!",
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