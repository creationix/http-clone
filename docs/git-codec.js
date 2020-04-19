import { toRaw, toString, toHex, indexOf, parseDec, parseOct } from "./utils.js";
const masks = {
    mask: 0o100000,
    blob: 0o140000,
    file: 0o160000,
};
export const modes = {
    tree: 0o040000,
    blob: 0o100644,
    file: 0o100644,
    exec: 0o100755,
    sym: 0o120000,
    commit: 0o160000,
};
export function isBlob(mode) {
    return (mode & masks.blob) === masks.mask;
}
export function isFile(mode) {
    return (mode & masks.file) === masks.mask;
}
export function toType(mode) {
    if (mode === modes.commit)
        return "commit";
    if (mode === modes.tree)
        return "tree";
    if (isBlob(mode))
        return "blob";
    return "unknown";
}
export function decodeBlob(body) {
    return body;
}
export function decodeTree(body) {
    var i = 0;
    var length = body.length;
    var start;
    var mode;
    var name;
    var hash;
    const tree = {};
    while (i < length) {
        start = i;
        i = indexOf(body, 0x20, start);
        if (i < 0)
            throw new SyntaxError("Missing space");
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
function readHeader(body, i, expectedKey) {
    if (body[i] === 0x0a)
        throw new Error("Missing header");
    let start = i;
    i = indexOf(body, 0x20, start);
    if (i < 0)
        throw new SyntaxError("Missing space");
    const key = toRaw(body, start, i++);
    if (key !== expectedKey)
        throw new Error(`Expected ${expectedKey}, but found ${key}`);
    start = i;
    i = indexOf(body, 0x0a, start);
    if (i < 0)
        throw new SyntaxError("Missing linefeed");
    const value = toString(body, start, i++);
    return [i, value];
}
export function decodeCommit(body) {
    let i = 0;
    let tree;
    [i, tree] = readHeader(body, i, "tree");
    const parents = [];
    while (body[i] === 0x70) {
        let parent;
        [i, parent] = readHeader(body, i, "parent");
        parents.push(parent);
    }
    let author;
    [i, author] = readHeader(body, i, "author");
    let committer;
    [i, committer] = readHeader(body, i, "committer");
    const message = toString(body, i + 1, body.length);
    return {
        tree,
        parents,
        author: decodePerson(author),
        committer: decodePerson(committer),
        message
    };
}
export function decodeTag(body) {
    let i = 0;
    let start;
    let key;
    const tag = {};
    while (body[i] !== 0x0a) {
        start = i;
        i = indexOf(body, 0x20, start);
        if (i < 0)
            throw new SyntaxError("Missing space");
        key = toRaw(body, start, i++);
        start = i;
        i = indexOf(body, 0x0a, start);
        if (i < 0)
            throw new SyntaxError("Missing linefeed");
        let value = toString(body, start, i++);
        if (key === "tagger")
            value = decodePerson(value);
        tag[key] = value;
    }
    i++;
    tag.message = toString(body, i, body.length);
    return tag;
}
function decodePerson(str) {
    const match = str.match(/^([^<]*) <([^>]*)> ([^ ]*) (.*)$/);
    if (!match)
        throw new Error("Improperly formatted person string");
    return {
        name: match[1],
        email: match[2],
        date: {
            seconds: parseInt(match[3], 10),
            offset: parseInt(match[4], 10) / 100 * -60
        }
    };
}
export function deframe(buffer, decode) {
    const space = indexOf(buffer, 0x20);
    if (space < 0)
        throw new Error("Invalid git object buffer");
    const nil = indexOf(buffer, 0x00, space);
    if (nil < 0)
        throw new Error("Invalid git object buffer");
    const body = buffer.subarray(nil + 1);
    const size = parseDec(buffer, space + 1, nil);
    if (size !== body.length)
        throw new Error("Invalid body length.");
    const type = toRaw(buffer, 0, space);
    if (!decode)
        return { type, body };
    if (type === "tree")
        return { type, body: decodeTree(body) };
    if (type === "tag")
        return { type, body: decodeTag(body) };
    if (type === "commit")
        return { type, body: decodeCommit(body) };
    if (type === "blob")
        return { type, body: decodeBlob(body) };
    throw new Error(`Unexpected git type '${type}'`);
}
//# sourceMappingURL=git-codec.js.map