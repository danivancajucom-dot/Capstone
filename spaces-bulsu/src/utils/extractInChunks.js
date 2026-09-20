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

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, rawText: chunks[i] }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Chunk ${i + 1}/${chunks.length}: non-JSON response.`);
    }

    if (!res.ok || !data.success) {
      throw new Error(
        `Chunk ${i + 1}/${chunks.length}: ${data.message || res.statusText}`
      );
    }

    allSchedules.push(...(data.schedules || []));
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