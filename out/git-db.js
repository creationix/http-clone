import { deframe } from "./git-codec.js";
import pako from "./jspm_packages/npm/pako@1.0.11/index.js";
const isHash = /^[0-9a-f]{40}$/;
;
export async function newGitRepo(url) {
    const refs = await newKeyValue(`${url}`);
    const objects = await newKeyValue(`objects`);
    let updatingHead;
    let updatingInfo;
    return {
        resolve,
        loadTag,
        loadCommit,
        loadTree,
        loadBlob,
        load,
        get,
        update
    };
    function updateHead() {
        if (updatingHead)
            return updatingHead;
        return updatingHead = (async () => {
            const res = await fetch(`${url}/HEAD`);
            if (res.status !== 200)
                throw new Error(`Unexpected ${res.status} status code response from HEAD.`);
            const line = await res.text();
            const match = line.match(/^ref: *([^ \r\n]+)/);
            if (!match)
                throw new Error(`Unexpected content ${JSON.stringify(line)} in HEAD response.`);
            const head = match[1];
            await refs.set("HEAD", head);
            updatingHead = undefined;
        })();
    }
    function updateInfo() {
        if (updatingInfo)
            return updatingInfo;
        return updatingInfo = (async () => {
            updatingInfo = undefined;
            const res = await fetch(`${url}/info/refs`);
            if (res.status !== 200)
                throw new Error(`Unexpected ${res.status} status code response from info/refs.`);
            const lines = await res.text();
            await Promise.all(lines.split('\n').filter(Boolean).map((line) => {
                const [hash, name] = line.split('\t');
                return refs.set(name, hash);
            }));
            updatingInfo = undefined;
        })();
    }
    async function resolve(ref) {
        if (ref === "HEAD") {
            const head = await refs.get("HEAD");
            if (head)
                return resolve(head);
            await updateHead();
            const head2 = await refs.get("HEAD");
            if (head2)
                return resolve(head2);
            throw new Error("Failed to resolve HEAD");
        }
        const cached = await refs.get(ref);
        if (cached)
            return cached;
        await updateInfo();
        const cached2 = await refs.get(ref);
        if (cached2)
            return cached2;
        throw new Error("TODO: Implement git.resolve...");
    }
    async function get(hash) {
        if (!isHash.test(hash))
            return get(await resolve(hash));
        const cached = await objects.get(hash);
        if (cached)
            return cached;
        const buf = await fetch(`${url}/objects/${hash.substr(0, 2)}/${hash.substr(2)}`)
            .then(res => res.arrayBuffer());
        await objects.set(hash, buf);
        return buf;
    }
    async function load(hash) {
        if (!isHash.test(hash))
            return load(await resolve(hash));
        const body = await get(hash);
        return deframe(pako.inflate(body), true);
    }
    async function loadTag(hash) {
        const obj = await load(hash);
        if (obj.type !== "tag")
            throw new Error(`Expected tag, but found ${obj.type}`);
        return obj.body;
    }
    async function loadCommit(hash) {
        const obj = await load(hash);
        if (obj.type !== "commit")
            throw new Error(`Expected commit, but found ${obj.type}`);
        return obj.body;
    }
    async function loadTree(hash) {
        const obj = await load(hash);
        if (obj.type !== "tree")
            throw new Error(`Expected tree, but found ${obj.type}`);
        return obj.body;
    }
    async function loadBlob(hash) {
        const obj = await load(hash);
        if (obj.type !== "blob")
            throw new Error(`Expected blob, but found ${obj.type}`);
        return obj.body;
    }
    async function update() {
        await Promise.all([
            updateHead(),
            updateInfo(),
        ]);
    }
}
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
//# sourceMappingURL=git-db.js.map