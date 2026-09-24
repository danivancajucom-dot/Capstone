export async function extractInChunks({
  rawText,
  endpoint,
  payload = {},
  maxChunkChars = 2000,
  onProgress,
}) {
  // Split by lines para hindi maputol ang isang schedule row
  const lines = rawText.split(/\r?\n/);
  const chunks = [];
  let current = "";

  for (const line of lines) {
    if (current && (current.length + line.length + 1) > maxChunkChars) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current.trim()) chunks.push(current);

  // Fallback: walang newlines pero sobrang haba
  if (chunks.length === 1 && chunks[0].length > maxChunkChars * 2) {
    const big = chunks[0];
    chunks.length = 0;
    for (let i = 0; i < big.length; i += maxChunkChars) {
      chunks.push(big.slice(i, i + maxChunkChars));
    }
  }

  console.log(`📦 Split into ${chunks.length} chunk(s)`);

  const allSchedules = [];
  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, chunks.length);

    const MAX_TRIES = 3;
    let attempt = 0;
    let data = null;

    while (attempt < MAX_TRIES) {
    attempt++;
    try {
        const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, rawText: chunks[i] }),
        });

        data = await res.json();

        // If 503/429 (overloaded), retry after short wait
        if (
        (res.status === 503 || res.status === 429) &&
        attempt < MAX_TRIES
        ) {
        console.warn(
            `Chunk ${i + 1} got ${res.status}. Retry ${attempt}/${MAX_TRIES}...`
        );
        if (onProgress) {
            onProgress(`retry-${attempt}`, chunks.length);
        }
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
        }

        if (!res.ok || !data.success) {
        throw new Error(
            `Chunk ${i + 1}/${chunks.length}: ${data.message || res.statusText}`
        );
        }

        // success
        break;
    } catch (err) {
        if (attempt >= MAX_TRIES) throw err;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    }

    allSchedules.push(...(data?.schedules || []));
  }

  // Dedupe
  const seen = new Set();
  const unique = [];
  for (const s of allSchedules) {
    const key = [
      (s.subject || "").toLowerCase().trim(),
      (s.section || "").toLowerCase().trim(),
      (s.day || "").toUpperCase().trim(),
      s.startTime || "",
      s.endTime || "",
      (s.room || "").toLowerCase().trim(),
      (s.faculty || "").toLowerCase().trim(),
    ].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  console.log(`✅ ${allSchedules.length} raw → ${unique.length} unique`);
  return unique;
}