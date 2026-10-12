/**
 * IndexedDB helper for photo blobs and local offline discovery records.
 * Keeps heavy image data out of localStorage to prevent quota exhaustion.
 */

const DB_NAME = 'terraquest_local_atlas';
const DB_VERSION = 1;
const STORE_PHOTOS = 'photos';
const STORE_OFFLINE_DISCOVERIES = 'offline_discoveries';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_OFFLINE_DISCOVERIES)) {
        db.createObjectStore(STORE_OFFLINE_DISCOVERIES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalPhoto(id: string, dataUrlOrBlob: string | Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    store.put({ id, data: dataUrlOrBlob, savedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalPhoto(id: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const store = tx.objectStore(STORE_PHOTOS);
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) return resolve(null);
      const val = request.result.data || request.result.dataUrl;
      if (typeof val === 'string') return resolve(val);
      if (val instanceof Blob) return resolve(URL.createObjectURL(val));
      resolve(null);
    };
    request.onerror = () => resolve(null);
  });
}

export async function deleteLocalPhoto(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalPhotoCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const store = tx.objectStore(STORE_PHOTOS);
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => resolve(0);
  });
}

export async function clearAllLocalPhotos(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    const store = tx.objectStore(STORE_PHOTOS);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export const idb = {
  savePhoto: async (id: string, fileOrBlob: Blob | File | string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PHOTOS, 'readwrite');
      const store = tx.objectStore(STORE_PHOTOS);
      store.put({ id, data: fileOrBlob, savedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  getPhoto: async (id: string): Promise<Blob | null> => {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PHOTOS, 'readonly');
      const store = tx.objectStore(STORE_PHOTOS);
      const request = store.get(id);
      request.onsuccess = () => {
        if (!request.result) return resolve(null);
        const val = request.result.data || request.result.dataUrl;
        if (val instanceof Blob) return resolve(val);
        if (typeof val === 'string') {
          fetch(val)
            .then((r) => r.blob())
            .then((b) => resolve(b))
            .catch(() => resolve(null));
          return;
        }
        resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  },

  getAllPhotos: async (): Promise<any[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PHOTOS, 'readonly');
      const store = tx.objectStore(STORE_PHOTOS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  },

  deletePhoto: async (id: string): Promise<void> => {
    return deleteLocalPhoto(id);
  },

  saveDiscovery: async (discovery: any): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE_DISCOVERIES, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_DISCOVERIES);
      store.put(discovery);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  getAllDiscoveries: async (): Promise<any[]> => {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_OFFLINE_DISCOVERIES, 'readonly');
      const store = tx.objectStore(STORE_OFFLINE_DISCOVERIES);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  },

  deleteDiscovery: async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OFFLINE_DISCOVERIES, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_DISCOVERIES);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  clearAllData: async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_PHOTOS, STORE_OFFLINE_DISCOVERIES], 'readwrite');
      tx.objectStore(STORE_PHOTOS).clear();
      tx.objectStore(STORE_OFFLINE_DISCOVERIES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
