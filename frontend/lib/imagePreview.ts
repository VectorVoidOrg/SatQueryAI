import { fromBlob } from "geotiff";

const MAX_DIMENSION = 640;

function canvasToDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/jpeg", 0.78);
}

async function previewWithBitmap(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToDataUrl(canvas);
}

async function previewGeoTiff(file: File) {
  const tiff = await fromBlob(file);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const rasters = await image.readRasters({
    width: targetWidth,
    height: targetHeight,
    interleave: false,
  });
  const channels = rasters as ArrayLike<number>[];
  const channelCount = channels.length;
  const pixelCount = targetWidth * targetHeight;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const output = new ImageData(targetWidth, targetHeight);

  const ranges = channels.map((channel) => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < pixelCount; index += 1) {
      const value = Number(channel[index]);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return { min, max: max === min ? min + 1 : max };
  });

  for (let index = 0; index < pixelCount; index += 1) {
    const red = Number(channels[0]?.[index] ?? 0);
    const green = Number(channels[Math.min(1, channelCount - 1)]?.[index] ?? red);
    const blue = Number(channels[Math.min(2, channelCount - 1)]?.[index] ?? red);
    const normalize = (value: number, channel: number) =>
      Math.max(0, Math.min(255, Math.round(((value - ranges[channel].min) / (ranges[channel].max - ranges[channel].min)) * 255)));
    output.data[index * 4] = normalize(red, 0);
    output.data[index * 4 + 1] = normalize(green, Math.min(1, channelCount - 1));
    output.data[index * 4 + 2] = normalize(blue, Math.min(2, channelCount - 1));
    output.data[index * 4 + 3] = 255;
  }

  canvas.getContext("2d")?.putImageData(output, 0, 0);
  return canvasToDataUrl(canvas);
}

export async function createImagePreview(file: File) {
  try {
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith(".tif") || lowerName.endsWith(".tiff")
      ? await previewGeoTiff(file)
      : await previewWithBitmap(file);
  } catch {
    return null;
  }
}

export async function createImagePreviewData(file: File) {
  const preview = await createImagePreview(file);
  let bounds: [number, number, number, number] | null = null;

  if (file.name.toLowerCase().endsWith(".tif") || file.name.toLowerCase().endsWith(".tiff")) {
    try {
      const image = await (await fromBlob(file)).getImage();
      const box = image.getBoundingBox();
      if (box && box.every(Number.isFinite) && box[0] !== box[2] && box[1] !== box[3]) {
        bounds = [box[0], box[1], box[2], box[3]];
      }
    } catch {
      bounds = null;
    }
  }

  return { preview, bounds };
}
