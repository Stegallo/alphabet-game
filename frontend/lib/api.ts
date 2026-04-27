const API = process.env.NEXT_PUBLIC_API_URL;

export interface SynthParams {
  type: OscillatorType;
  frequency: number;
  duration: number;
  pitch_drop?: boolean;
  noise?: boolean;
}

export interface SoundResponse {
  sound_id: string;
  synth: SynthParams;
  requested_by: string;
}

export async function playSound(soundId: string, accessToken: string): Promise<SoundResponse> {
  const res = await fetch(`${API}/sounds/${soundId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Sound request failed: ${res.status}`);
  return res.json();
}
