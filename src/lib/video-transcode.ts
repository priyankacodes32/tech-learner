import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Single-threaded core — avoids needing COOP/COEP cross-origin-isolation
// headers site-wide, at the cost of some speed vs the -mt core variant.
const CORE_BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  loadPromise ??= (async () => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();
  return loadPromise;
}

// Runs entirely in the browser (WebAssembly) — much slower than native ffmpeg,
// so this is only used for files above the storage size cap. Uses VP8 in
// realtime mode (VP9 is far too slow in wasm), scaled to max 854px wide.
// The input must fit in the wasm heap, so very large files are rejected up front.
export const MAX_TRANSCODE_INPUT_BYTES = 400 * 1024 * 1024;

export async function transcodeToWebm(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  if (file.size > MAX_TRANSCODE_INPUT_BYTES) {
    throw new Error(
      "This video is too large to convert in the browser. Compress it below 400 MB first (e.g. with HandBrake) or use a YouTube/URL link.",
    );
  }
  const ffmpeg = await getFFmpeg();
  const inputExt = /\.[a-z0-9]+$/i.exec(file.name)?.[0] ?? ".mp4";
  const inputName = `input${inputExt}`;
  const outputName = "output.webm";

  const onProgressEvent = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", onProgressEvent);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const exitCode = await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "scale=min(854\\,iw):-2",
      "-c:v",
      "libvpx",
      "-deadline",
      "realtime",
      "-cpu-used",
      "8",
      "-crf",
      "34",
      "-b:v",
      "900k",
      "-c:a",
      "libopus",
      "-b:a",
      "64k",
      outputName,
    ]);
    if (exitCode !== 0) throw new Error("Video conversion failed");
    const data = await ffmpeg.readFile(outputName);
    return new Blob([new Uint8Array(data as Uint8Array)], { type: "video/webm" });
  } finally {
    ffmpeg.off("progress", onProgressEvent);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
