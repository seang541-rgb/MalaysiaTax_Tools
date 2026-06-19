/**
 * Markdown chunker for the RAG knowledge base.
 *
 * Port of training-data/scripts/embed-and-upload.py `chunk_text`, kept
 * byte-for-byte compatible so the web reindex (/api/admin/reindex) produces the
 * same chunks as the offline Python pipeline.
 */

export interface Chunk {
  content: string;
  heading: string;
}

const CHUNK_SIZE = 500; // target chars per chunk
const CHUNK_OVERLAP = 50; // overlap between chunks

export function chunkText(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.trim().split(/\n{2,}/);

  let currentHeading = "";
  let currentChunk = "";

  for (const raw of paragraphs) {
    const para = raw.trim();
    if (!para) continue;

    // Track headings for context (markdown "# ...").
    if (para.startsWith("#")) {
      currentHeading = para.replace(/^#+/, "").trim();
    }

    if (currentChunk.length + para.length > CHUNK_SIZE && currentChunk) {
      chunks.push({ content: currentChunk.trim(), heading: currentHeading });
      const overlap =
        currentChunk.length > CHUNK_OVERLAP
          ? currentChunk.slice(-CHUNK_OVERLAP)
          : "";
      currentChunk = overlap + "\n\n" + para;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), heading: currentHeading });
  }

  return chunks;
}

/** Extract the document title from the first markdown H1, or fall back to the filename. */
export function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)/);
  if (match) return match[1].trim();
  return filename.replace(/\.md$/, "").replace(/-/g, " ");
}
