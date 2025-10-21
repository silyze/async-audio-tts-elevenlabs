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

const RECONNECT_MIN_DELAY_MS = 200;
const RECONNECT_MAX_ATTEMPTS = 5;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function mergeAbortSignals(
  ...signals: (AbortSignal | undefined)[]
): AbortSignal | undefined {
  const activeSignals = signals.filter(
    (signal): signal is AbortSignal => Boolean(signal)
  );

  if (activeSignals.length === 0) {
    return undefined;
  }

  const controller = new AbortController();
  const onAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  for (const signal of activeSignals) {
    if (signal.aborted) {
      onAbort();
      break;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  return controller.signal;
}

type ElevenLabsStreamState = {
  connectionId: number;
  websocket: WebSocket;
  stream: AsyncStream<ElevenLabsSubscribeEvent, ElevenLabsPublishEvent>;
  abortController: AbortController;
  cleanup: () => void;
};

export default class ElevenLabsTextToSpeachModel implements TextToSpeachModel {
  #region: ElevenLabsRegion;
  #voiceId: string;
  #apiKey?: string;
  #settings?: ElevenLabsWebSocketSettings;
  #buffer?: AsyncBufferConfig | boolean;
  #format: ElevenLabsOutputFormat;
  #readyPromise: Promise<void>;
  #initialInit: Omit<ElevenLabsInitializeConnectionEvent, "text"> | undefined;
  #init: Omit<ElevenLabsInitializeConnectionEvent, "text"> | undefined;

  #streamState?: ElevenLabsStreamState;
  #connectPromise?: Promise<void>;
  #reconnectPromise?: Promise<void>;
  #closePromise?: Promise<void>;
  #closeRequested = false;
  #connectionError?: Error;
  #reconnectAttempts = 0;
  #connectionCounter = 0;
  #pendingSockets = new Set<WebSocket>();

  private constructor(
    config: {
      region: ElevenLabsRegion;
      voiceId: string;
      apiKey?: string;
      settings?: ElevenLabsWebSocketSettings;
    },
    buffer: AsyncBufferConfig | boolean | undefined,
    format: ElevenLabsOutputFormat,
    init: Omit<ElevenLabsInitializeConnectionEvent, "text"> | undefined
  ) {
    this.#region = config.region;
    this.#voiceId = config.voiceId;
    this.#apiKey = config.apiKey;
    this.#settings = config.settings;
    this.#buffer = buffer;
    this.#format = format;
    this.#initialInit = init ? { ...init } : undefined;
    this.#init = this.#initialInit;
    this.#readyPromise = this.#startConnect();
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
    return new ElevenLabsTextToSpeachModel(
      {
        region,
        voiceId: voice_id,
        apiKey,
        settings,
      },
      buffer,
      settings?.output_format ?? "mp3_44100_128",
      init
    );
  }

  get ready(): Promise<void> {
    return this.#readyPromise;
  }

  async speak(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed.length) {
      return;
    }

    const previousInit = this.#init;
    if (previousInit) {
      this.#init = undefined;
    }

    const stream = (await this.#ensureStreamState()).stream;

    await ElevenLabsTextToSpeachModel.#packets(stream).sendText({
      text: trimmed,
      ...previousInit,
    });
  }

  async send(event: ElevenLabsPublishEvent) {
    const previousInit = this.#init;
    if (previousInit) {
      this.#init = undefined;
    }

    const stream = (await this.#ensureStreamState()).stream;

    await ElevenLabsTextToSpeachModel.#packets(stream).sendText({
      ...event,
      ...previousInit,
    });
  }

  async close(): Promise<void> {
    if (!this.#closePromise) {
      this.#closePromise = this.#performClose();
    }
    return this.#closePromise;
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
    while (true) {
      if (this.#closeRequested) {
        return;
      }

      const state = await this.#ensureStreamState();
      const combinedSignal = mergeAbortSignals(
        signal,
        state.abortController.signal
      );

      let sawFinal = false;

      for await (const output of state.stream.read(combinedSignal)) {
        if (!("audio" in output)) {
          throw new ElevenLabsError(output);
        }
        if (output.isFinal) {
          sawFinal = true;
          break;
        }

        yield Buffer.from(output.audio, "base64");
      }

      if (sawFinal || this.#closeRequested) {
        return;
      }

      if (!state.abortController.signal.aborted) {
        return;
      }

      await this.#waitForReconnect(signal);
    }
  }

  transform(): AsyncTransform<Buffer<ArrayBufferLike>> {
    return new AsyncTransform(this);
  }

  async #performClose(): Promise<void> {
    this.#closeRequested = true;

    if (this.#pendingSockets.size > 0) {
      for (const socket of this.#pendingSockets) {
        try {
          socket.close();
        } catch {
          // ignore close errors for pending sockets
        }
      }
      this.#pendingSockets.clear();
    }

    const pendingAttempts = [
      this.#connectPromise,
      this.#reconnectPromise,
    ].filter((promise): promise is Promise<void> => Boolean(promise));

    if (pendingAttempts.length > 0) {
      await Promise.allSettled(pendingAttempts);
    }

    const state = this.#streamState;
    this.#streamState = undefined;

    if (state) {
      try {
        await ElevenLabsTextToSpeachModel.#packets(state.stream).closeConnection(
          { text: "" }
        );
      } catch {
        // ignore close errors
      } finally {
        state.cleanup();
        if (!state.abortController.signal.aborted) {
          state.abortController.abort();
        }
        try {
          state.websocket.close();
        } catch {
          // ignore close errors
        }
      }
    }

    this.#connectionError = new Error("ElevenLabs stream closed");
  }

  #startConnect(): Promise<void> {
    if (!this.#connectPromise) {
      const pending = this.#connect();
      const wrapped = pending.finally(() => {
        if (this.#connectPromise === wrapped) {
          this.#connectPromise = undefined;
        }
      });
      this.#connectPromise = wrapped;
    }
    return this.#connectPromise;
  }

  async #connect(): Promise<void> {
    const state = await this.#openStreamState();

    if (this.#closeRequested) {
      state.cleanup();
      if (!state.abortController.signal.aborted) {
        state.abortController.abort();
      }
      try {
        state.websocket.close();
      } catch {
        // ignore close errors
      }
      return;
    }

    this.#installState(state);
  }

  async #openStreamState(): Promise<ElevenLabsStreamState> {
    const url = this.#buildWebSocketUrl();
    const websocket = new WebSocket(
      url,
      this.#apiKey
        ? {
            headers: { "xi-api-key": this.#apiKey },
          }
        : undefined
    );

    this.#pendingSockets.add(websocket);

    try {
      const stream = await getWebsocketStream(
        websocket,
        ElevenLabsWebSocketEncoding,
        this.#buffer
      );
      const abortController = new AbortController();
      const connectionId = ++this.#connectionCounter;

      const handleCloseOrError = () => {
        this.#handleSocketClosure(connectionId);
      };

      websocket.addEventListener("close", handleCloseOrError);
      websocket.addEventListener("error", handleCloseOrError);

      return {
        connectionId,
        websocket,
        stream,
        abortController,
        cleanup: () => {
          websocket.removeEventListener("close", handleCloseOrError);
          websocket.removeEventListener("error", handleCloseOrError);
        },
      };
    } catch (error) {
      try {
        websocket.close();
      } catch {
        // ignore close errors
      }
      throw error;
    } finally {
      this.#pendingSockets.delete(websocket);
    }
  }

  #buildWebSocketUrl(): URL {
    const url = getWebSocketUrl(this.#voiceId, this.#region);
    if (this.#settings) {
      for (const [name, value] of Object.entries(this.#settings)) {
        if (value === undefined) {
          continue;
        }
        let stringValue: string;
        switch (typeof value) {
          case "string":
            stringValue = value;
            break;
          case "boolean":
            stringValue = value ? "true" : "false";
            break;
          default:
            stringValue = `${value}`;
            break;
        }
        url.searchParams.set(name, stringValue);
      }
    }
    return url;
  }

  #installState(state: ElevenLabsStreamState) {
    this.#streamState?.cleanup();
    this.#streamState = state;
    this.#reconnectAttempts = 0;
    this.#connectionError = undefined;
    this.#init = this.#initialInit;
  }

  #handleSocketClosure(connectionId: number) {
    const state = this.#streamState;
    if (!state || state.connectionId !== connectionId) {
      return;
    }

    state.cleanup();
    if (!state.abortController.signal.aborted) {
      state.abortController.abort();
    }
    this.#streamState = undefined;

    if (this.#closeRequested) {
      return;
    }

    this.#scheduleReconnect();
  }

  #scheduleReconnect() {
    if (this.#reconnectPromise || this.#closeRequested) {
      return;
    }

    const wrapped = this.#attemptReconnect().finally(() => {
      if (this.#reconnectPromise === wrapped) {
        this.#reconnectPromise = undefined;
      }
    });

    this.#reconnectPromise = wrapped;
  }

  async #attemptReconnect(): Promise<void> {
    let lastError: unknown;

    while (
      !this.#closeRequested &&
      this.#reconnectAttempts < RECONNECT_MAX_ATTEMPTS
    ) {
      if (this.#reconnectAttempts > 0) {
        await wait(RECONNECT_MIN_DELAY_MS);
      }

      this.#reconnectAttempts += 1;

      try {
        await this.#startConnect();

        if (this.#closeRequested) {
          return;
        }

        if (this.#streamState) {
          this.#reconnectAttempts = 0;
          this.#connectionError = undefined;
          return;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (!this.#closeRequested && !this.#connectionError) {
      this.#connectionError =
        lastError instanceof Error
          ? lastError
          : new Error("Failed to reconnect to ElevenLabs stream.");
    }
  }

  async #ensureStreamState(): Promise<ElevenLabsStreamState> {
    if (this.#connectionError) {
      throw this.#connectionError;
    }

    if (this.#streamState) {
      return this.#streamState;
    }

    if (this.#closeRequested) {
      throw new Error("ElevenLabs stream is closed");
    }

    if (!this.#connectPromise && !this.#reconnectPromise) {
      this.#scheduleReconnect();
    }

    const pending = this.#reconnectPromise ?? this.#connectPromise;

    if (pending) {
      try {
        await pending;
      } catch (error) {
        if (error instanceof Error) {
          this.#connectionError = error;
        }
      }
    }

    if (this.#connectionError) {
      throw this.#connectionError;
    }

    if (!this.#streamState) {
      throw new Error("Unable to establish ElevenLabs stream connection.");
    }

    return this.#streamState;
  }

  async #waitForReconnect(signal?: AbortSignal): Promise<void> {
    while (!this.#closeRequested) {
      if (signal?.aborted) {
        return;
      }

      if (this.#streamState) {
        return;
      }

      if (this.#connectionError) {
        throw this.#connectionError;
      }

      this.#scheduleReconnect();

      const pending = this.#reconnectPromise ?? this.#connectPromise;

      if (pending) {
        try {
          await pending;
        } catch {
          // ignore and re-evaluate state
        }
      } else {
        await wait(RECONNECT_MIN_DELAY_MS);
      }
    }
  }
}
