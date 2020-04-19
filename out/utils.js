export function toRaw(buffer, start = 0, end = buffer.length) {
    let str = "";
    for (let i = start; i < end; i++) {
        str += String.fromCharCode(buffer[i]);
    }
    return str;
}
export function toString(buffer, start = 0, end = buffer.length) {
    return utf8Decode(toRaw(buffer, start, end));
}
export function toHex(buffer, start = 0, end = buffer.length) {
    let hex = "";
    for (let i = start; i < end; i++) {
        const byte = buffer[i].toString(16);
        hex += byte.length > 1 ? byte : ('0' + byte);
    }
    return hex;
}
export function indexOf(buffer, byte, i = 0) {
    const length = buffer.length;
    for (i |= 0; i < length; i++) {
        if (buffer[i] === byte)
            return i;
    }
    return -1;
}
export function parseOct(buffer, start, end) {
    let val = 0;
    while (start < end) {
        val = (val << 3) + buffer[start++] - 0x30;
    }
    return val;
}
export function parseDec(buffer, start, end) {
    let val = 0;
    while (start < end) {
        val = val * 10 + buffer[start++] - 0x30;
    }
    return val;
}
export function utf8Decode(raw) {
    return decodeURIComponent(escape(raw));
}
//# sourceMappingURL=utils.js.map