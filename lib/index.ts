import {
  AsyncStream,
  AsyncTransform,
  AsyncBufferConfig,
} from "@mojsoski/async-stream";
import { AudioFormat } from "@silyze/async-audio-stream";
import WebSocket from "ws";
import TextToSpeachModel from "@silyze/async-audio-tts";
import {
  getWebsocketStream,
  JsonEncoding,
  WebsocketStreamEncoding,
} from "@mojsoski/async-websocket-stream";
import PcmFormat from "@silyze/async-audio-format-pcm";
import ULawFormat from "@silyze/async-audio-format-ulaw";
import ALawFormat from "@silyze/async-audio-format-alaw";
import createAudioFormat from "@silyze/async-audio-ffmpeg";

export enum ElevenLabsRegion {
  auto = "api.elevenlabs.io",
  america = "api.us.elevenlabs.io",
  europe = "api.eu.residency.elevenlabs.io",
  india = "api.in.residency.elevenlabs.io",
}

function getWebSocketUrl(voiceId: string, region: ElevenLabsRegion) {
  return new URL(
    `wss://${region}/v1/text-to-speech/${encodeURIComponent(
      voiceId
    )}/stream-input`
  );
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

function makeOpusFormat(
  name: string,
  sampleRate: number,
  kbps: number,
  opts?: {
    container?: "opus" | "ogg" | "webm";
    vbr?: "on" | "off" | "constrained";
  }
): AudioFormat {
  const container = opts?.container ?? "opus";
  const vbr = opts?.vbr ?? "on";

  return new (createAudioFormat(name, (sampleRate) => [
    "-c:a",
    "libopus",
    "-ar",
    String(sampleRate),
    "-b:a",
    `${kbps}k`,
    "-vbr",
    vbr,
    "-f",
    container,
  ]))(sampleRate);
}

function makeMp3Format(
  name: string,
  sampleRate: number,
  kbps: number
): AudioFormat {
  return new (createAudioFormat(name, (sampleRate) => [
    "-c:a",
    "libmp3lame",
    "-ar",
    String(sampleRate),
    "-b:a",
    `${kbps}k`,
    "-f",
    "mp3",
  ]))(sampleRate);
}

function fromElevenLabsFormat(format: ElevenLabsOutputFormat): AudioFormat {
  switch (format) {
    case "pcm_8000":
      return new PcmFormat(8000);
    case "pcm_16000":
      return new PcmFormat(16000);
    case "pcm_22050":
      return new PcmFormat(22050);
    case "pcm_24000":
      return new PcmFormat(24000);
    case "pcm_44100":
      return new PcmFormat(44100);
    case "ulaw_8000":
      return new ULawFormat(8000);
    case "alaw_8000":
      return new ALawFormat(8000);

    case "opus_48000_32":
      return makeOpusFormat("opus-48000-32", 48000, 32, {
        container: "opus",
        vbr: "on",
      });
    case "opus_48000_64":
      return makeOpusFormat("opus-48000-64", 48000, 64, {
        container: "opus",
        vbr: "on",
      });
    case "opus_48000_96":
      return makeOpusFormat("opus-48000-96", 48000, 96, {
        container: "opus",
        vbr: "on",
      });
    case "opus_48000_128":
      return makeOpusFormat("opus-48000-128", 48000, 128, {
        container: "opus",
        vbr: "on",
      });
    case "opus_48000_192":
      return makeOpusFormat("opus-48000-192", 48000, 192, {
        container: "opus",
        vbr: "on",
      });
    case "mp3_22050_32":
      return makeMp3Format("mp3-22050-32", 22050, 32);
    case "mp3_44100_32":
      return makeMp3Format("mp3-44100-32", 44100, 32);
    case "mp3_44100_96":
      return makeMp3Format("mp3-44100-96", 44100, 96);
    case "mp3_44100_128":
      return makeMp3Format("mp3-44100-128", 44100, 128);
    case "mp3_44100_192":
      return makeMp3Format("mp3-44100-192", 44100, 192);
  }
  throw new TypeError(`Cannot decode unknown audio format: ${format}`);
}

export type ElevenLabsTextNormalization = "auto" | "on" | "off";

export type ElevenLabsWebSocketSettings = {
  authorization?: string;
  model_id?: string;
  language_code?: string;
  enable_logging?: boolean;
  enable_ssml_parsing?: boolean;
  output_format?: ElevenLabsOutputFormat;
  inactivity_timeout?: number;
  sync_alignment?: boolean;
  auto_mode?: boolean;
  apply_text_normalization?: ElevenLabsTextNormalization;
  seed?: number;
};

export interface ElevenLabsTextToSpeachConfig {
  region?: ElevenLabsRegion;
  voice_id: string;
  ["xi-api-key"]?: string;
  settings?: ElevenLabsWebSocketSettings;
  init?: Omit<ElevenLabsInitializeConnectionEvent, "text">;
}

export type ElevenLabsPronounciationDictionaryLocator = {
  pronunciation_dictionary_id: string;
  version_id: string;
};

export type ElevenLabsVoiceSettings = {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
};

export type ElevenLabsGeneratorConfig = { chunk_length_schedule?: number[] };

export type ElevenLabsInitializeConnectionEvent = {
  text: string;
  voice_settings?: ElevenLabsVoiceSettings;
  generator_config?: ElevenLabsGeneratorConfig;
  pronunciation_dictionary_locators?: ElevenLabsPronounciationDictionaryLocator[];
  ["xi-api-key"]?: string;
  authorization?: string;
};

export type ElevenLabsSendTextEvent = {
  text: string;
  try_trigger_generation?: boolean;
  flush?: boolean;
};

export type ElevenLabsCloseConnectionEvent = {
  text: "";
};

export type ElevenLabsPublishEvent =
  | ElevenLabsCloseConnectionEvent
  | ElevenLabsSendTextEvent
  | ElevenLabsInitializeConnectionEvent;

export type ElevenLabsAlignment = {
  charStartTimesMs?: number[];
  charsDurationsMs?: number[];
  chars?: string[];
};

export type ElevenLabsAudioOutputEvent = {
  audio: string;
  normalizedAlignment?: ElevenLabsAlignment;
  alignment?: ElevenLabsAlignment;
  isFinal: false;
};

export type ElevenLabsFinalAudioEvent = {
  audio: null;
  isFinal: true;
};

export type ElevenLabsErrorEvent = {
  message: string;
  error: string;
  code: number;
};

export class ElevenLabsError extends Error {
  #code: number;
  #error: string;

  get code() {
    return this.#code;
  }

  get error() {
    return this.#error;
  }

  constructor(event: ElevenLabsErrorEvent) {
    super(event.message, { cause: event });
    this.#code = event.code;
    this.#error = event.error;
  }
}

export type ElevenLabsSubscribeEvent =
  | ElevenLabsAudioOutputEvent
  | ElevenLabsFinalAudioEvent
  | ElevenLabsErrorEvent;

const ElevenLabsWebSocketEncoding: WebsocketStreamEncoding<
  ElevenLabsSubscribeEvent,
  ElevenLabsPublishEvent
> = {
  encode(input) {
    return JsonEncoding.encode(input);
  },
  decode(data) {
    return JsonEncoding.decode(data) as ElevenLabsSubscribeEvent;
  },
};

export default class ElevenLabsTextToSpeachModel implements TextToSpeachModel {
  #streamPromise: Promise<
    AsyncStream<ElevenLabsSubscribeEvent, ElevenLabsPublishEvent>
  >;
  #readyPromise: Promise<void>;
  #format: ElevenLabsOutputFormat;
  #init: Omit<ElevenLabsInitializeConnectionEvent, "text"> | undefined;
  private constructor(
    streamPromise: Promise<
      AsyncStream<ElevenLabsSubscribeEvent, ElevenLabsPublishEvent>
    >,
    format: ElevenLabsOutputFormat,
    init: Omit<ElevenLabsInitializeConnectionEvent, "text"> | undefined
  ) {
    this.#streamPromise = streamPromise;
    this.#readyPromise = streamPromise.then();
    this.#format = format;
    this.#init = init;
  }

  static connect(
    {
      region = ElevenLabsRegion.auto,
      voice_id,
      "xi-api-key": apiKey,
      settings,
      init,
    }: ElevenLabsTextToSpeachConfig,
    buffer?: AsyncBufferConfig | boolean
  ) {
    const url = getWebSocketUrl(voice_id, region);

    if (settings) {
      for (const [name, value] of Object.entries(settings)) {
        let stringValue: string;
        switch (typeof value) {
          case "string":
            stringValue = value;
            break;
          case "boolean":
            stringValue = value ? "true" : "false";
            break;
          default:
            stringValue = value.toString();
            break;
        }
        url.searchParams.set(name, stringValue);
      }
    }

    const ws = new WebSocket(
      url,
      apiKey
        ? {
            headers: { "xi-api-key": apiKey },
          }
        : undefined
    );

    const promise = getWebsocketStream(ws, ElevenLabsWebSocketEncoding, buffer);

    return new ElevenLabsTextToSpeachModel(
      promise,
      settings?.output_format ?? "mp3_44100_128",
      init
    );
  }

  get ready(): Promise<void> {
    return this.#readyPromise;
  }

  async speak(text: string): Promise<void> {
    const previousInit = this.#init;
    if (previousInit) {
      this.#init = undefined;
    }

    if (!text.length) {
      await ElevenLabsTextToSpeachModel.#packets(
        this.#streamPromise
      ).closeConnection({ text: "", ...previousInit });
      return;
    }

    await ElevenLabsTextToSpeachModel.#packets(this.#streamPromise).sendText({
      text,
      ...previousInit,
    });
  }

  async send(event: ElevenLabsPublishEvent) {
    const previousInit = this.#init;
    if (previousInit) {
      this.#init = undefined;
    }

    await ElevenLabsTextToSpeachModel.#packets(this.#streamPromise).sendText({
      ...event,
      ...previousInit,
    });
  }

  static #packets(
    streamOrPromise:
      | Promise<AsyncStream<ElevenLabsSubscribeEvent, ElevenLabsPublishEvent>>
      | AsyncStream<ElevenLabsSubscribeEvent, ElevenLabsPublishEvent>
  ) {
    return {
      initializeConnection: async (
        args: ElevenLabsInitializeConnectionEvent
      ) => {
        const stream = await streamOrPromise;
        await stream.write(args);
      },
      sendText: async (args: ElevenLabsSendTextEvent) => {
        const stream = await streamOrPromise;
        await stream.write(args);
      },
      closeConnection: async (args: ElevenLabsCloseConnectionEvent) => {
        const stream = await streamOrPromise;
        await stream.write(args);
      },
    };
  }

  get format(): AudioFormat {
    return fromElevenLabsFormat(this.#format);
  }

  async *read(signal?: AbortSignal): AsyncIterable<Buffer<ArrayBufferLike>> {
    const stream = await this.#streamPromise;

    for await (const output of stream.read(signal)) {
      if (!("audio" in output)) {
        throw new ElevenLabsError(output);
      }
      if (output.isFinal) {
        break;
      }

      yield Buffer.from(output.audio, "base64");
    }
  }

  transform(): AsyncTransform<Buffer<ArrayBufferLike>> {
    return new AsyncTransform(this);
  }
}
