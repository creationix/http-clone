// tslint:disable: no-bitwise

import { toRaw, toString, toHex, indexOf, parseDec, parseOct } from "./utils.js";

type GitPerson = {
    name: string,
    email: string
    date: {
        seconds: number,
        offset: number
    }
};

export type GitCommit = {
    tree: string,
    parents: string[],
    author: GitPerson,
    committer: GitPerson,
    message: string,
};

export type GitTag = { [key: string]: string | GitPerson };

export type GitTree = { [key: string]: { mode: number, hash: string } };

export type GitBlob = Uint8Array;

export type GitObject = GitCommit | GitTag | GitTree | GitBlob;

const masks = {
    mask: 0o100000,
    blob: 0o140000,
    file: 0o160000,
};

const modes = {
    tree: 0o040000,
    blob: 0o100644,
    file: 0o100644,
    exec: 0o100755,
    sym: 0o120000,
    commit: 0o160000,
};

export function isBlob(mode: number) {
    return (mode & masks.blob) === masks.mask;
}

export function isFile(mode: number) {
    return (mode & masks.file) === masks.mask;
}

export function toType(mode: number) {
    if (mode === modes.commit) return "commit";
    if (mode === modes.tree) return "tree";
    if (isBlob(mode)) return "blob";
    return "unknown";
}



export function decodeBlob(body: Uint8Array): GitBlob {
    return body;
}

export function decodeTree(body: Uint8Array): GitTree {
    var i = 0;
    var length = body.length;
    var start;
    var mode;
    var name;
    var hash;
    const tree: GitTree = {};
    while (i < length) {
        start = i;
        i = indexOf(body, 0x20, start);
        if (i < 0) throw new SyntaxError("Missing space");
        mode = parseOct(body, start, i++);
        start = i;
        i = indexOf(body, 0x00, start);
        name = toString(body, start, i++);
        hash = toHex(body, i, i += 20);
        tree[name] = {
            mode: mode,
            hash: hash
        };
    }
    return tree;
}

export function decodeCommit(body: Uint8Array): GitCommit {
    let i = 0;
    let start: number;
    let key: string;
    const parents: string[] = [];
    let tree: string;
    let author: GitPerson;
    let committer: GitPerson;
    let message: string;
    while (body[i] !== 0x0a) {
        start = i;
        i = indexOf(body, 0x20, start);
        if (i < 0) throw new SyntaxError("Missing space");
        key = toRaw(body, start, i++);
        start = i;
        i = indexOf(body, 0x0a, start);
        if (i < 0) throw new SyntaxError("Missing linefeed");
        const value: string = toString(body, start, i++);
        if (key === "parent") parents.push(value);
        else if (key === "tree") tree = value;
        else if (key === "author") author = decodePerson(value);
        else if (key === "committer") committer = decodePerson(value);
    }
    i++;
    message = toString(body, i, body.length);
    return { tree, parents, author, committer, message };
}

export function decodeTag(body: Uint8Array): GitTag {
    let i = 0;
    let start: number;
    let key: string;
    const tag: GitTag = {};
    while (body[i] !== 0x0a) {
        start = i;
        i = indexOf(body, 0x20, start);
        if (i < 0) throw new SyntaxError("Missing space");
        key = toRaw(body, start, i++);
        start = i;
        i = indexOf(body, 0x0a, start);
        if (i < 0) throw new SyntaxError("Missing linefeed");
        let value: string | GitPerson = toString(body, start, i++);
        if (key === "tagger") value = decodePerson(value);
        tag[key] = value;
    }
    i++;
    tag.message = toString(body, i, body.length);
    return tag;
}

function decodePerson(str: string): GitPerson {
    const match = str.match(/^([^<]*) <([^>]*)> ([^ ]*) (.*)$/);
    if (!match) throw new Error("Improperly formatted person string");
    return {
        name: match[1],
        email: match[2],
        date: {
            seconds: parseInt(match[3], 10),
            offset: parseInt(match[4], 10) / 100 * -60
        }
    };
}

export type TaggedObject = { type: "tree", body: GitTree }
    | { type: "tag", body: GitTag }
    | { type: "commit", body: GitCommit }
    | { type: "blob", body: GitBlob };

export function deframe(buffer: Uint8Array, decode: true): TaggedObject
export function deframe(buffer: Uint8Array, decode: false): { type: string, body: Uint8Array }
export function deframe(buffer: Uint8Array, decode: boolean): TaggedObject | { type: string, body: Uint8Array } {
    const space = indexOf(buffer, 0x20);
    if (space < 0) throw new Error("Invalid git object buffer");
    const nil = indexOf(buffer, 0x00, space);
    if (nil < 0) throw new Error("Invalid git object buffer");
    const body = buffer.subarray(nil + 1);
    const size = parseDec(buffer, space + 1, nil);
    if (size !== body.length) throw new Error("Invalid body length.");
    const type = toRaw(buffer, 0, space) as "tree" | "tag" | "commit" | "blob";
    if (!decode) return { type, body };
    if (type === "tree") return { type, body: decodeTree(body) };
    if (type === "tag") return { type, body: decodeTag(body) };
    if (type === "commit") return { type, body: decodeCommit(body) };
    if (type === "blob") return { type, body: decodeBlob(body) };
    throw new Error(`Unexpected git type '${type}'`);
}

