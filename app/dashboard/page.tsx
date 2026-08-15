import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      username: true,
      rating: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold text-yellow-400 mb-4">
        👑 Chess Arena
      </h1>

      <h2 className="text-3xl font-bold mb-6">
        Добре дошъл, {user.username}!
      </h2>

      <div className="bg-slate-800 p-8 rounded-xl w-[420px] space-y-4 shadow-xl">
        <p>
          <strong>👤 Потребител:</strong> {user.username}
        </p>

        <p>
          <strong>⭐ Рейтинг:</strong> {user.rating}
        </p>

        <p>
          <strong>🏆 Победи:</strong> 0
        </p>

        <p>
          <strong>❌ Загуби:</strong> 0
        </p>

        <p>
          <strong>🤝 Ремита:</strong> 0
        </p>

        <button className="w-full bg-yellow-400 text-black font-bold py-3 rounded hover:bg-yellow-500">
          ▶ Play Chess
        </button>

        <LogoutButton />
      </div>
    </div>
  );
}