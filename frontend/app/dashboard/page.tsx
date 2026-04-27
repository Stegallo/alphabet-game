"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { playSound, SynthParams } from "@/lib/api";
import { useRef } from "react";

const SOUNDS = ["kick", "snare", "hihat", "clap"];

function playSynth(ctx: AudioContext, params: SynthParams) {
  const { type, frequency, duration, pitch_drop, noise } = params;
  const now = ctx.currentTime;

  if (noise) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (pitch_drop) osc.frequency.exponentialRampToValueAtTime(0.001, now + duration);
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const audioCtxRef = useRef<AudioContext | null>(null);

  if (status === "loading") return <p>Loading…</p>;

  if (!session) {
    return (
      <main style={{ padding: "2rem" }}>
        <p>You must be signed in to use the sound board.</p>
        <button onClick={() => signIn("google")}>Sign in with Google</button>
      </main>
    );
  }

  async function handlePlay(soundId: string) {
    // AudioContext must be created/resumed after a user gesture
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();

    try {
      const data = await playSound(soundId, (session as any).accessToken);
      playSynth(audioCtxRef.current, data.synth);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main style={{ padding: "2rem" }}>
      <p>Signed in as {session.user?.email}</p>
      <button onClick={() => signOut()}>Sign out</button>
      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
        {SOUNDS.map((id) => (
          <button key={id} onClick={() => handlePlay(id)} style={{ padding: "1rem 2rem", fontSize: "1rem" }}>
            {id}
          </button>
        ))}
      </div>
    </main>
  );
}
