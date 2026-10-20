// Fotos da abertura de OS guardadas no aparelho (IndexedDB) assim que são tiradas.
// No Android com pouca memória a página pode ser fechada por trás e recarregar — as fotos já
// tiradas voltam daqui. Limpo ao abrir a OS ou em "Começar do zero".
// `scope` separa os conjuntos: "open" (abertura) e "finish-<id>" (fotos de saída de cada OS) —
// limpar um nunca apaga o outro.

const DB_NAME = "oficinasync";
const STORE = "os_draft_photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req ? (req.result as T) : undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** Guarda a foto (chave: "front" | "rear" | "left" | "right" | "extra-0"…). Falha em silêncio. */
export async function savePhoto(key: string, file: File, scope = "open"): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.put(file, `${scope}:${key}`));
  } catch {
    // sem IndexedDB (aba anônima, cota): segue só com a foto em memória
  }
}

/** Todas as fotos guardadas, por chave. */
export async function loadPhotos(scope = "open"): Promise<Record<string, File>> {
  try {
    const out: Record<string, File> = {};
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const key = String(cursor.key);
        if (key.startsWith(`${scope}:`)) out[key.slice(scope.length + 1)] = cursor.value as File;
        cursor.continue();
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
    return out;
  } catch {
    return {};
  }
}

export async function clearPhotos(scope = "open"): Promise<void> {
  try {
    // apaga só as chaves "<scope>:..." (faixa [scope:, scope;) — ";" vem logo depois de ":")
    await withStore("readwrite", (s) => s.delete(IDBKeyRange.bound(`${scope}:`, `${scope};`, false, true)));
  } catch {
    // nada a limpar
  }
}
