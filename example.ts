import ElevenLabsTextToSpeachModel from "./lib";
import fs from "fs/promises";
async function main() {
  const tts = ElevenLabsTextToSpeachModel.connect({
    voice_id: "JBFqnCBsd6RMkjVDRZzb",
    "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
    settings: {
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_192",
      enable_logging: false,
    },
    init: {
      voice_settings: {
        speed: 1.2,
      },
    },
  });

  await tts.ready;

  await tts.speak("Hello, World");

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
