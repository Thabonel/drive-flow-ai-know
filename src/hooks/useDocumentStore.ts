import localForage from 'localforage';
import cosineSimilarity from 'compute-cosine-similarity';

export interface StoredDocument {
  id: string;
  title: string;
  content: string;
  embedding: number[];
}

const store = localForage.createInstance({ name: 'documents' });

function hashToken(token: string) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function embed(text: string, dims = 512): number[] {
  const vec = new Array(dims).fill(0);
  text
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean)
    .forEach((tok) => {
      const idx = Math.abs(hashToken(tok)) % dims;
      vec[idx] += 1;
    });
  return vec;
}

export async function addDocument(doc: { id: string; title: string; content: string }) {
  const embedding = embed(doc.content);
  const record: StoredDocument = { ...doc, embedding };
  await store.setItem(doc.id, record);
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const docs: StoredDocument[] = [];
  await store.iterate<StoredDocument, void>((value) => {
    docs.push(value);
  });
  return docs;
}

export async function searchDocuments(query: string, topK = 5): Promise<StoredDocument[]> {
  const docs = await getAllDocuments();
  const qEmbed = embed(query);
  const scored = docs.map((d) => ({ doc: d, score: cosineSimilarity(d.embedding, qEmbed) || 0 }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.doc);
}
