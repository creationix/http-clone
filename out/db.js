export function newKeyValue(prefix) {
    let db;
    return new Promise((resolve, reject) => {
        let version = 1;
        const request = indexedDB.open(prefix, version);
        request.onupgradeneeded = () => {
            version++;
            db = request.result;
            db.createObjectStore("data");
        };
        request.onsuccess = () => {
            db = request.result;
            resolve({ get, set });
        };
        request.onerror = () => reject(request.error);
    });
    function get(key) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("data", "readonly");
            const store = transaction.objectStore("data");
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    function set(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction("data", "readwrite");
            const store = transaction.objectStore("data");
            const request = store.put(value, key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
;
//# sourceMappingURL=db.js.map