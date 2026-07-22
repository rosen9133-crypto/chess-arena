"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message);
      router.push("/dashboard");
    } else {
      alert(data.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-slate-800 p-8 rounded-xl w-96 space-y-5"
      >
        <h1 className="text-3xl font-bold text-center text-yellow-400">
          Sign In
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-slate-700 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded bg-slate-700 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded hover:bg-yellow-500"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
