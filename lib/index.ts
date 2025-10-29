import {
  AsyncStream,
  AsyncTransform,
  AsyncBufferConfig,
} from "@mojsoski/async-stream";
import { AudioFormat } from "@silyze/async-audio-stream";
import WebSocket from "ws";
import type { CloseEvent, ErrorEvent } from "ws";
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

export interface ILogOptions {
  log(area: string, message: string, extra?: object): void;
}

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

const NoopLogger: ILogOptions = {
  log() {
    // intentionally empty
  },
};

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

type ElevenLabsPacketHandlers = {
  initializeConnection: (
    args: ElevenLabsInitializeConnectionEvent
  ) => Promise<void>;
  sendText: (args: ElevenLabsSendTextEvent) => Promise<void>;
  closeConnection: (args: ElevenLabsCloseConnectionEvent) => Promise<void>;
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
  #logger: ILogOptions;

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
    init: Omit<ElevenLabsInitializeConnectionEvent, "text"> | undefined,
    log: ILogOptions | undefined
  ) {
    this.#logger = log ?? NoopLogger;
    this.#region = config.region;
    this.#voiceId = config.voiceId;
    this.#apiKey = config.apiKey;
    this.#settings = config.settings;
    this.#buffer = buffer;
    this.#format = format;
    this.#initialInit = init ? { ...init } : undefined;
    this.#init = this.#initialInit;
    this.#log("lifecycle", "Model instance created", {
      region: this.#region,
      voiceId: this.#voiceId,
      apiKey: this.#apiKey,
      hasInitialInit: Boolean(this.#initialInit),
    });
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
    buffer?: AsyncBufferConfig | boolean,
    log?: ILogOptions
  ) {
    const normalizedSettings: ElevenLabsWebSocketSettings = {
      enable_logging: true,
      ...(settings ?? {}),
    };

    const outputFormat =
      normalizedSettings.output_format ?? "mp3_44100_128";

    return new ElevenLabsTextToSpeachModel(
      {
        region,
        voiceId: voice_id,
        apiKey,
        settings: normalizedSettings,
      },
      buffer,
      outputFormat,
      init,
      log
    );
  }

  get ready(): Promise<void> {
    return this.#readyPromise;
  }

  async speak(text: string): Promise<void> {
    this.#log("speak", "Speak invoked", { textLength: text.length, text });
    const trimmed = text.trim();
    if (!trimmed.length) {
      this.#log("speak", "Speak skipped due to empty text after trim");
      return;
    }

    const state = await this.#ensureStreamState();
    this.#log("speak", "Stream state ready for speak", {
      connectionId: state.connectionId,
    });
    const packets = ElevenLabsTextToSpeachModel.#packets(state.stream);

    this.#log("speak", "Sending speech text", {
      textLength: trimmed.length,
    });
    await this.#sendText(packets, trimmed);

    this.#log("speak", "Requesting flush for speech generation");
    await packets.sendText({
      text: "",
      flush: true,
      try_trigger_generation: true,
    });
    this.#log("speak", "Speak completed");
  }

  async send(event: ElevenLabsPublishEvent) {
    this.#log("send", "Send invoked", {
      eventKeys: Object.keys(event),
      text:
        "text" in event
          ? event.text
          : undefined,
    });
    const state = await this.#ensureStreamState();
    this.#log("send", "Stream state ready for send", {
      connectionId: state.connectionId,
    });
    const packets = ElevenLabsTextToSpeachModel.#packets(state.stream);

    if (
      "voice_settings" in event ||
      "generator_config" in event ||
      "pronunciation_dictionary_locators" in event ||
      "authorization" in event ||
      "xi-api-key" in event
    ) {
      this.#init = undefined;
      await packets.initializeConnection(
        event as ElevenLabsInitializeConnectionEvent
      );
      this.#log("send", "Sent initializeConnection packet", {
        hasVoiceSettings: Boolean(
          (event as ElevenLabsInitializeConnectionEvent).voice_settings
        ),
        hasGeneratorConfig: Boolean(
          (event as ElevenLabsInitializeConnectionEvent).generator_config
        ),
      });
      return;
    }

    if (
      !("flush" in event) &&
      !("try_trigger_generation" in event) &&
      event.text === ""
    ) {
      await packets.closeConnection({ text: "" });
      this.#log("send", "Sent closeConnection packet");
      return;
    }

    if (event.text.length > 0) {
      this.#log("send", "Sending text payload", {
        textLength: event.text.length,
      });
      await this.#sendText(packets, event.text);
    }

    const sendTextEvent = event as ElevenLabsSendTextEvent;
    const { flush, try_trigger_generation } = sendTextEvent;

    if (
      flush !== undefined ||
      try_trigger_generation !== undefined
    ) {
      this.#log("send", "Sending flush/trigger packet", {
        flush: flush ?? false,
        tryTriggerGeneration: try_trigger_generation ?? false,
      });
      await packets.sendText({
        text: event.text.length > 0 ? "" : event.text,
        flush,
        try_trigger_generation,
      });
    }
    this.#log("send", "Send invocation complete");
  }

  async close(): Promise<void> {
    this.#log("close", "Close requested");
    if (!this.#closePromise) {
      this.#log("close", "Initiating close sequence");
      this.#closePromise = this.#performClose();
    } else {
      this.#log("close", "Close already in progress");
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

  async #sendText(
    packets: ElevenLabsPacketHandlers,
    text: string
  ): Promise<void> {
    const previousInit = this.#init;
    this.#log("send", "Preparing to send text", {
      textLength: text.length,
      hasPendingInit: Boolean(previousInit),
    });
    if (previousInit) {
      this.#init = undefined;
      this.#log("send", "Sending initializeConnection with text payload");
      await packets.initializeConnection({
        text,
        ...previousInit,
      });
      this.#log("send", "initializeConnection with text payload sent");
      return;
    }

    await packets.sendText({ text });
    this.#log("send", "Text packet sent");
  }

  get format(): AudioFormat {
    return fromElevenLabsFormat(this.#format);
  }

  async *read(signal?: AbortSignal): AsyncIterable<Buffer<ArrayBufferLike>> {
    this.#log("read", "Read iterator started");
    while (true) {
      if (this.#closeRequested) {
        this.#log("read", "Read exiting due to close request");
        return;
      }

      const state = await this.#ensureStreamState();
      this.#log("read", "Stream state ready for read", {
        connectionId: state.connectionId,
      });
      const combinedSignal = mergeAbortSignals(
        signal,
        state.abortController.signal
      );

      let sawFinal = false;

      for await (const output of state.stream.read(combinedSignal)) {
        if (!("audio" in output)) {
          if ("error" in output) {
            if (output.error === "input_timeout_exceeded") {
              sawFinal = true;
              this.#log("read", "Input timeout exceeded, treating as final");
              break;
            }
            this.#log("read", "Error event received from stream", {
              error: output.error,
              message: output.message,
            });
            throw new ElevenLabsError(output);
          }
          this.#log("read", "Unexpected event received from stream", {
            keys: Object.keys(output),
          });
          throw new ElevenLabsError(output);
        }
        if (output.isFinal) {
          sawFinal = true;
          this.#log("read", "Final audio event received");
          break;
        }

        const chunk = Buffer.from(output.audio, "base64");
        this.#log("read", "Audio chunk decoded", {
          chunkSize: chunk.length,
        });
        yield chunk;
      }

      if (sawFinal || this.#closeRequested) {
        this.#log("read", "Read loop terminating after final event or close");
        return;
      }

      if (!state.abortController.signal.aborted) {
        this.#log("read", "Read loop exiting without abort signal");
        return;
      }

      this.#log("read", "Awaiting reconnect after aborted stream");
      await this.#waitForReconnect(signal);
    }
  }

  transform(): AsyncTransform<Buffer<ArrayBufferLike>> {
    this.#log("transform", "Creating AsyncTransform wrapper");
    return new AsyncTransform(this);
  }

  async #performClose(): Promise<void> {
    this.#log("close", "Close sequence started");
    this.#closeRequested = true;

    if (this.#pendingSockets.size > 0) {
      this.#log("close", "Closing pending sockets", {
        pending: this.#pendingSockets.size,
      });
      for (const socket of this.#pendingSockets) {
        try {
          socket.close();
        } catch (error) {
          this.#log("close", "Error while closing pending socket", {
            error: error instanceof Error ? error.message : String(error),
          });
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
      this.#log("close", "Awaiting pending connection attempts", {
        pendingAttempts: pendingAttempts.length,
      });
      await Promise.allSettled(pendingAttempts);
    }

    const state = this.#streamState;
    this.#streamState = undefined;

    if (state) {
      this.#log("close", "Sending close packet to stream", {
        connectionId: state.connectionId,
      });
      try {
        await ElevenLabsTextToSpeachModel.#packets(state.stream).closeConnection(
          { text: "" }
        );
        this.#log("close", "Close packet sent", {
          connectionId: state.connectionId,
        });
      } catch (error) {
        this.#log("close", "Error while sending close packet", {
          connectionId: state.connectionId,
          error: error instanceof Error ? error.message : String(error),
        });
        // ignore close errors
      } finally {
        state.cleanup();
        if (!state.abortController.signal.aborted) {
          state.abortController.abort();
        }
        try {
          state.websocket.close();
        } catch (error) {
          this.#log("close", "Error while closing websocket", {
            connectionId: state.connectionId,
            error: error instanceof Error ? error.message : String(error),
          });
          // ignore close errors
        }
      }
    }

    this.#connectionError = new Error("ElevenLabs stream closed");
    this.#log("close", "Close sequence complete");
  }

  #log(area: string, message: string, extra?: object) {
    try {
      this.#logger.log(area, message, extra);
    } catch {
      // ignore logging errors
    }
  }

  #startConnect(): Promise<void> {
    if (!this.#connectPromise) {
      this.#log("connection", "Starting initial connect");
      const pending = this.#connect();
      const wrapped = pending.finally(() => {
        if (this.#connectPromise === wrapped) {
          this.#connectPromise = undefined;
        }
      });
      this.#connectPromise = wrapped;
    } else {
      this.#log("connection", "Connect requested while pending");
    }
    return this.#connectPromise;
  }

  async #connect(): Promise<void> {
    this.#log("connection", "Connect routine invoked");
    const state = await this.#openStreamState();
    this.#log("connection", "Stream state opened", {
      connectionId: state.connectionId,
    });

    if (this.#closeRequested) {
      this.#log("connection", "Close requested during connect", {
        connectionId: state.connectionId,
      });
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

    this.#log("connection", "Installing stream state", {
      connectionId: state.connectionId,
    });
    this.#installState(state);
  }

  async #openStreamState(): Promise<ElevenLabsStreamState> {
    const url = this.#buildWebSocketUrl();
    this.#log("connection", "Opening WebSocket connection", {
      url: url.toString(),
    });
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
      this.#log("connection", "WebSocket stream established", {
        connectionId,
      });

      const handleClose = (event: CloseEvent) => {
        this.#handleSocketClosure(connectionId, {
          eventType: "close",
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
      };

      const handleError = (event: ErrorEvent) => {
        const details: Record<string, unknown> = {
          eventType: "error",
        };
        if (event.message) {
          details.message = event.message;
        }
        if (event.error !== undefined) {
          details.error =
            event.error instanceof Error
              ? event.error.message
              : String(event.error);
        }
        this.#handleSocketClosure(connectionId, details);
      };

      websocket.addEventListener("close", handleClose);
      websocket.addEventListener("error", handleError);

      return {
        connectionId,
        websocket,
        stream,
        abortController,
        cleanup: () => {
          websocket.removeEventListener("close", handleClose);
          websocket.removeEventListener("error", handleError);
        },
      };
    } catch (error) {
      this.#log("connection", "WebSocket stream failed to open", {
        error: error instanceof Error ? error.message : String(error),
      });
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
    this.#log("connection", "Built WebSocket URL", {
      url: url.toString(),
      hasSettings: Boolean(this.#settings),
    });
    return url;
  }

  #installState(state: ElevenLabsStreamState) {
    const replacing = Boolean(this.#streamState);
    this.#log("connection", "Installing new stream state", {
      connectionId: state.connectionId,
      replacing,
    });
    this.#streamState?.cleanup();
    this.#streamState = state;
    this.#reconnectAttempts = 0;
    this.#connectionError = undefined;
    this.#init = this.#initialInit;
    this.#log("connection", "Stream state installation complete", {
      connectionId: state.connectionId,
    });
  }

  #handleSocketClosure(
    connectionId: number,
    details?: Record<string, unknown>
  ) {
    const withDetails = (base: Record<string, unknown>) =>
      details ? { ...base, ...details } : base;

    const state = this.#streamState;
    if (!state) {
      this.#log(
        "connection",
        "Socket closure ignored, no active state",
        withDetails({ connectionId })
      );
      return;
    }
    if (state.connectionId !== connectionId) {
      this.#log(
        "connection",
        "Socket closure ignored, stale connection",
        withDetails({
          connectionId,
          activeConnectionId: state.connectionId,
        })
      );
      return;
    }

    this.#log(
      "connection",
      "Socket closure detected",
      withDetails({ connectionId })
    );
    state.cleanup();
    if (!state.abortController.signal.aborted) {
      state.abortController.abort();
    }
    this.#streamState = undefined;

    if (this.#closeRequested) {
      this.#log(
        "connection",
        "Socket closure during close request",
        withDetails({ connectionId })
      );
      return;
    }

    this.#log(
      "connection",
      "Scheduling reconnect after socket closure",
      withDetails({ connectionId })
    );
    this.#scheduleReconnect();
  }

  #scheduleReconnect() {
    if (this.#reconnectPromise) {
      this.#log("reconnect", "Reconnect already scheduled");
      return;
    }
    if (this.#closeRequested) {
      this.#log("reconnect", "Reconnect skipped due to closing");
      return;
    }

    this.#log("reconnect", "Scheduling reconnect attempt", {
      attempt: this.#reconnectAttempts + 1,
    });
    const wrapped = this.#attemptReconnect().finally(() => {
      if (this.#reconnectPromise === wrapped) {
        this.#reconnectPromise = undefined;
        this.#log("reconnect", "Reconnect promise cleared");
      }
    });

    this.#reconnectPromise = wrapped;
  }

  async #attemptReconnect(): Promise<void> {
    let lastError: unknown;
    this.#log("reconnect", "Reconnect routine started", {
      attemptsSoFar: this.#reconnectAttempts,
    });

    while (
      !this.#closeRequested &&
      this.#reconnectAttempts < RECONNECT_MAX_ATTEMPTS
    ) {
      if (this.#reconnectAttempts > 0) {
        this.#log("reconnect", "Waiting before next reconnect attempt", {
          delayMs: RECONNECT_MIN_DELAY_MS,
          attempt: this.#reconnectAttempts + 1,
        });
        await wait(RECONNECT_MIN_DELAY_MS);
      }

      this.#reconnectAttempts += 1;
      this.#log("reconnect", "Attempting reconnect", {
        attempt: this.#reconnectAttempts,
        maxAttempts: RECONNECT_MAX_ATTEMPTS,
      });

      try {
        await this.#startConnect();

        if (this.#closeRequested) {
          this.#log("reconnect", "Reconnect aborted due to close request");
          return;
        }

        if (this.#streamState) {
          this.#log("reconnect", "Reconnect successful", {
            attempt: this.#reconnectAttempts,
          });
          this.#reconnectAttempts = 0;
          this.#connectionError = undefined;
          return;
        }
      } catch (error) {
        this.#log("reconnect", "Reconnect attempt failed", {
          attempt: this.#reconnectAttempts,
          error: error instanceof Error ? error.message : String(error),
        });
        lastError = error;
      }
    }

    if (!this.#closeRequested && !this.#connectionError) {
      this.#connectionError =
        lastError instanceof Error
          ? lastError
          : new Error("Failed to reconnect to ElevenLabs stream.");
      this.#log("reconnect", "Reconnect attempts exhausted", {
        attempts: this.#reconnectAttempts,
        error:
          this.#connectionError instanceof Error
            ? this.#connectionError.message
            : String(this.#connectionError),
      });
    }
  }

  async #ensureStreamState(): Promise<ElevenLabsStreamState> {
    if (this.#connectionError) {
      this.#log("connection", "ensureStreamState throwing stored error", {
        error: this.#connectionError.message,
      });
      throw this.#connectionError;
    }

    const cachedStreamState = this.#streamState;
    if (cachedStreamState !== undefined) {
      this.#log("connection", "ensureStreamState returning cached state", {
        connectionId: cachedStreamState.connectionId,
      });
      return cachedStreamState;
    }

    if (this.#closeRequested) {
      this.#log("connection", "ensureStreamState called during close");
      throw new Error("ElevenLabs stream is closed");
    }

    if (!this.#connectPromise && !this.#reconnectPromise) {
      this.#log("connection", "No connection pending, scheduling reconnect");
      this.#scheduleReconnect();
    }

    const pending = this.#reconnectPromise ?? this.#connectPromise;

    if (pending) {
      try {
        this.#log("connection", "Awaiting pending connection");
        await pending;
      } catch (error) {
        this.#log("connection", "Pending connection rejected", {
          error: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof Error) {
          this.#connectionError = error;
        }
      }
    }

    if (this.#connectionError) {
      this.#log("connection", "Throwing connection error after awaiting", {
        error: this.#connectionError.message,
      });
      throw this.#connectionError;
    }

    if (!this.#streamState) {
      this.#log("connection", "No stream state after pending connection");
      throw new Error("Unable to establish ElevenLabs stream connection.");
    }

    const streamState = this.#streamState;
    this.#log("connection", "ensureStreamState resolved stream state", {
      connectionId: streamState.connectionId,
    });
    return streamState;
  }

  async #waitForReconnect(signal?: AbortSignal): Promise<void> {
    this.#log("reconnect", "Waiting for reconnect to complete");
    while (!this.#closeRequested) {
      if (signal?.aborted) {
        this.#log("reconnect", "Reconnect wait aborted by signal");
        return;
      }

      const streamState = this.#streamState;
      if (streamState !== undefined) {
        this.#log("reconnect", "Stream state restored during wait", {
          connectionId: streamState.connectionId,
        });
        return;
      }

      if (this.#connectionError) {
        this.#log("reconnect", "Reconnect wait throwing connection error", {
          error: this.#connectionError.message,
        });
        throw this.#connectionError;
      }

      this.#scheduleReconnect();

      const pending = this.#reconnectPromise ?? this.#connectPromise;

      if (pending) {
        try {
          this.#log("reconnect", "Awaiting reconnect promise during wait");
          await pending;
        } catch {
          // ignore and re-evaluate state
          this.#log("reconnect", "Reconnect wait caught rejected promise");
        }
      } else {
        this.#log("reconnect", "No reconnect promise, sleeping", {
          delayMs: RECONNECT_MIN_DELAY_MS,
        });
        await wait(RECONNECT_MIN_DELAY_MS);
      }
    }
  }
}
