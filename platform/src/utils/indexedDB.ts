// IndexedDB 工具类
const DB_NAME = 'OkFredDB';
const DB_VERSION = 1;
const STORE_NAME = 'i18n';


type TranslationData = Awaited<ReturnType<typeof import('@/api/i18n/translation').listAllFn>>['data']['data'][0]
class IndexedDBHelper {
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储空间
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  // 保存多语言列表
  async saveTranslationList(data: TranslationData[]): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let count = 0;

      // 先清空旧数据
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // 添加新数据
        data.forEach((item) => {
          const addRequest = store.add(item);
          addRequest.onsuccess = () => {
            count++;
          };
        });
      };

      transaction.oncomplete = () => {
        resolve(count);
      };

      transaction.onerror = () => {
        reject(new Error('Failed to save i18n data'));
      };
    });
  }

  // 获取多语言列表
  async getTranslationList(): Promise<TranslationData[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get i18n data'));
      };
    });
  }

  // 清除所有数据
  async clearTranslationList(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear i18n data'));
      };
    });
  }
}

export const indexedDBHelper = new IndexedDBHelper();
