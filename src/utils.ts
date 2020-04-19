// tslint:disable: no-bitwise

export function toRaw(buffer: Uint8Array, start: number = 0, end: number = buffer.length): string {
    let str = "";
    for (let i = start; i < end; i++) {
        str += String.fromCharCode(buffer[i]);
    }
    return str;
}

export function toString(buffer: Uint8Array, start: number = 0, end: number = buffer.length): string {
    return utf8Decode(toRaw(buffer, start, end));
}

export function toHex(buffer: Uint8Array, start: number = 0, end: number = buffer.length): string {
    let hex = "";
    for (let i = start; i < end; i++) {
        const byte = buffer[i].toString(16);
        hex += byte.length > 1 ? byte : ('0' + byte);
    }
    return hex;
}

export function indexOf(buffer: Uint8Array, byte: number, i: number = 0) {
    const length = buffer.length;
    for (i |= 0; i < length; i++) {
        if (buffer[i] === byte) return i;
    }
    return -1;
}

export function parseOct(buffer: Uint8Array, start: number, end: number) {
    let val = 0;
    while (start < end) {
        val = (val << 3) + buffer[start++] - 0x30;
    }
    return val;
}

export function parseDec(buffer: Uint8Array, start: number, end: number) {
    let val = 0;
    while (start < end) {
        val = val * 10 + buffer[start++] - 0x30;
    }
    return val;
}

export function utf8Decode(raw: string): string {
    return decodeURIComponent(escape(raw));
}
