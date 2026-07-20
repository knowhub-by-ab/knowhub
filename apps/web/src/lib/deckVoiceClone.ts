// src/lib/deckVoiceClone.ts
// Voice cloning via ElevenLabs, Fish Audio, Resemble AI.

export type VoiceProvider = "elevenlabs" | "fishaudio" | "resembleai";

export interface CloneVoiceResult {
  voiceId: string;
  provider: VoiceProvider;
}

export async function cloneVoice(
  provider: VoiceProvider,
  apiKey: string,
  sampleFile: File,
  voiceName: string
): Promise<CloneVoiceResult> {
  if (provider === "elevenlabs") {
    const fd = new FormData();
    fd.append("name", voiceName);
    fd.append("files", sampleFile);
    const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: fd,
    });
    if (!res.ok) throw new Error(`ElevenLabs voice clone failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { voice_id: string };
    return { voiceId: data.voice_id, provider };
  }

  if (provider === "fishaudio") {
    const fd = new FormData();
    fd.append("visibility", "private");
    fd.append("type", "tts");
    fd.append("title", voiceName);
    fd.append("voices", sampleFile);
    const res = await fetch("https://api.fish.audio/model", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: fd,
    });
    if (!res.ok) throw new Error(`Fish Audio voice clone failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { _id: string };
    return { voiceId: data._id, provider };
  }

  if (provider === "resembleai") {
    const res = await fetch("https://api.resemble.ai/v2/voices", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: voiceName }),
    });
    if (!res.ok) throw new Error(`Resemble AI voice failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { item?: { uuid: string } };
    const voiceId = data.item?.uuid ?? "";
    return { voiceId, provider };
  }

  throw new Error(`Unknown voice provider: ${provider}`);
}

export async function synthesizeWithClonedVoice(
  provider: VoiceProvider,
  apiKey: string,
  voiceId: string,
  text: string,
  modelId?: string
): Promise<Blob> {
  if (provider === "elevenlabs") {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: modelId ?? "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${res.status}`);
    return res.blob();
  }

  if (provider === "fishaudio") {
    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, reference_id: voiceId, format: "mp3", streaming: false }),
    });
    if (!res.ok) throw new Error(`Fish Audio TTS failed: ${res.status}`);
    return res.blob();
  }

  if (provider === "resembleai") {
    const res = await fetch("https://api.resemble.ai/v2/clips/sync", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ voice_uuid: voiceId, body: text, output_format: "mp3" }),
    });
    if (!res.ok) throw new Error(`Resemble AI TTS failed: ${res.status}`);
    const data = await res.json() as { item?: { audio_src: string } };
    const audioUrl = data.item?.audio_src;
    if (!audioUrl) throw new Error("Resemble AI returned no audio URL");
    const audioRes = await fetch(audioUrl);
    return audioRes.blob();
  }

  throw new Error(`Unknown provider: ${provider}`);
}
