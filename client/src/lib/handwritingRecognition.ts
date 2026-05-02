/**
 * Handwriting via Google Input Tools (no API key). Latency is mostly network + client debounce.
 */
export const HANDWRITING_RECOGNITION_DEBOUNCE_MS = 400;

export type HandwritingStroke = { xs: number[]; ys: number[]; ts: number[] };

const HANDWRITING_URL =
  'https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8';

export async function recognizeHandwriting(
  strokes: HandwritingStroke[],
  canvasWidth: number,
  canvasHeight: number,
  signal?: AbortSignal
): Promise<string[]> {
  if (strokes.length === 0) return [];
  const ink = strokes.map(s => [s.xs, s.ys, s.ts]);
  const payload = {
    options: 'enable_pre_space',
    requests: [
      {
        writing_guide: { writing_area_width: canvasWidth, writing_area_height: canvasHeight },
        ink,
        language: 'en',
      },
    ],
  };
  const response = await fetch(HANDWRITING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) throw new Error('Recognition request failed');
  const data = await response.json();
  if (data[0] === 'SUCCESS' && data[1]?.[0]?.[1]) return data[1][0][1] as string[];
  return [];
}
