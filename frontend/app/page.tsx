"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  if (status === "loading") return <p>Loading…</p>;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Sound App</h1>
      <button onClick={() => signIn("google")}>Sign in with Google</button>
    </main>
  );
}
