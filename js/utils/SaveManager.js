// Save Manager - IndexedDB wrapper for game state

export default class SaveManager {
    constructor() {
        this.dbName = 'GooseCraftDB';
        this.dbVersion = 1;
        this.storeName = 'saves';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('SaveManager: IndexedDB error:', event.target.error);
                reject('Error opening database');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('SaveManager: Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                    console.log('SaveManager: Created object store');
                }
            };
        });
    }

    async saveGame(saveId, gameState) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const saveObject = {
                id: saveId,
                timestamp: Date.now(),
                data: gameState
            };

            const request = store.put(saveObject);

            request.onsuccess = () => {
                console.log(`SaveManager: Successfully saved game ${saveId}`);
                resolve(true);
            };

            request.onerror = (event) => {
                console.error('SaveManager: Error saving game:', event.target.error);
                reject(false);
            };
        });
    }

    async loadGame(saveId) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(saveId);

            request.onsuccess = (event) => {
                if (request.result) {
                    console.log(`SaveManager: Successfully loaded game ${saveId}`);
                    resolve(request.result.data);
                } else {
                    console.log(`SaveManager: No save found for ${saveId}`);
                    resolve(null);
                }
            };

            request.onerror = (event) => {
                console.error('SaveManager: Error loading game:', event.target.error);
                reject(null);
            };
        });
    }

    async deleteSave(saveId) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(saveId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(false);
        });
    }
}
