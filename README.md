# Async Audio TTS — ElevenLabs

ElevenLabs streaming Text‑to‑Speech implementation of the `@silyze/async-audio-tts` interface. Produces audio as an asynchronous stream compatible with `@silyze/async-audio-stream` utilities.

## Install

```bash
npm install @silyze/async-audio-tts-elevenlabs
```

This package depends on `@silyze/async-audio-tts` and `@silyze/async-audio-stream` and uses `ws` for the real‑time ElevenLabs WebSocket API. It exposes the standard audio stream types (e.g., `AudioOutputStream`, `AudioFormat`).

## Quick Start

Create a streaming TTS connection to ElevenLabs and consume audio chunks:

```ts
import ElevenLabsTextToSpeachModel, {
  ElevenLabsRegion,
} from "@silyze/async-audio-tts-elevenlabs";
import fs from "fs/promises";

async function main() {
  const tts = ElevenLabsTextToSpeachModel.connect({
    region: ElevenLabsRegion.auto, // default
    voice_id: "JBFqnCBsd6RMkjVDRZzb", // pick a voice ID
    "xi-api-key": process.env.ELEVEN_LABS_API_KEY, // or pass an explicit token
    settings: {
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
      enable_logging: false,
    },
    init: {
      voice_settings: { speed: 1.2 },
    },
  });

  await tts.ready;

  // Start synthesis
  await tts.speak("Hello, World");

  // Write chunks to a file
  const file = await fs.open("example.mp3", "w");
  try {
    for await (const chunk of tts.transform()) {
      await file.write(chunk);
    }
  } finally {
    await file.close();
    await tts.close();
  }
}

main();
```

## API

- Default export `ElevenLabsTextToSpeachModel` implements `TextToSpeachModel` and adds:
  - `static connect(config: ElevenLabsTextToSpeachConfig)` — opens a realtime WebSocket to ElevenLabs.
  - `ready: Promise<void>` — resolves when the connection is established.
  - `speak(text: string): Promise<void>` — enqueues text for synthesis. Empty or whitespace-only strings are ignored.
  - `send(event: ElevenLabsPublishEvent): Promise<void>` — send low‑level realtime events directly.
  - `transform(): AsyncTransform<Buffer>` — helper to pipe audio into other async streams.
  - `format: AudioFormat` — describes emitted audio, derived from `settings.output_format`.
  - `close(): Promise<void>` - gracefully ends the realtime session and stops automatic reconnect attempts.

From `@silyze/async-audio-tts` and `@silyze/async-audio-stream`:

- `TextToSpeachModel` — an async readable stream of `Buffer` chunks with `ready` and `speak()`.
- `AudioOutputStream` / `AudioFormat` — audio stream surface and metadata for consumers.

## Type Definition

```ts
import TextToSpeachModel from "@silyze/async-audio-tts";
import { AudioFormat } from "@silyze/async-audio-stream";

export enum ElevenLabsRegion {
  auto = "api.elevenlabs.io",
  america = "api.us.elevenlabs.io",
  europe = "api.eu.residency.elevenlabs.io",
  india = "api.in.residency.elevenlabs.io",
}

export type ElevenLabsOutputFormat =
  | "mp3_22050_32"
  | "mp3_44100_32"
  | "mp3_44100_96"
  | "mp3_44100_128"
  | "mp3_44100_192"
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_44100"
  | "ulaw_8000"
  | "alaw_8000"
  | "opus_48000_32"
  | "opus_48000_64"
  | "opus_48000_96"
  | "opus_48000_128"
  | "opus_48000_192";

export interface ElevenLabsTextToSpeachConfig {
  region?: ElevenLabsRegion;
  voice_id: string;
  "xi-api-key"?: string; // or use Authorization in settings/init
  settings?: {
    model_id?: string;
    output_format?: ElevenLabsOutputFormat; // defaults to "mp3_44100_128"
    enable_logging?: boolean;
    // …other ElevenLabs realtime query params (language_code, seed, etc.)
  };
  init?: {
    voice_settings?: { speed?: number; stability?: number /* … */ };
    // …other ElevenLabs initializeConnection fields (generator_config, dictionaries, etc.)
  };
}

export default class ElevenLabsTextToSpeachModel implements TextToSpeachModel {
  static connect(
    config: ElevenLabsTextToSpeachConfig
  ): ElevenLabsTextToSpeachModel;
  get ready(): Promise<void>;
  speak(text: string): Promise<void>;
  close(): Promise<void>;
  send(event: unknown): Promise<void>;
  get format(): AudioFormat;
  read(signal?: AbortSignal): AsyncIterable<Buffer>;
  transform(): AsyncIterable<Buffer> & { pipe: Function };
}
```

## Notes

- Call `tts.close()` when you're done to close the realtime session explicitly.
- Multiple `speak()` calls enqueue additional audio on the same output stream.
- Start reading immediately to avoid backpressure; audio chunks arrive asynchronously.
- `tts.format` reflects the `settings.output_format` you selected.
- Provide your API key via `"xi-api-key"` environment variable.
- Empty strings passed to `speak` are trimmed and ignored instead of closing the stream.
- If the ElevenLabs connection closes unexpectedly, the client retries up to five times with at least 200ms between attempts before surfacing an error. Calling `close()` stops those retry attempts.


