const CLASS_MATCH = /\.[^.#$]+/g;
const ID_MATCH = /#[^.#$]+/;
const REF_MATCH = /\$[^.#$]+/;
const TAG_MATCH = /^[^.#$]+/;
export function domBuilder(json, refs) {
    if (typeof json === 'string')
        return document.createTextNode(json);
    if (json instanceof HTMLElement || json instanceof Text || json instanceof DocumentFragment)
        return json;
    if (!Array.isArray(json))
        return document.createTextNode(json + "");
    if (!json.length)
        return document.createDocumentFragment();
    let node;
    let first = false;
    for (let i = 0, l = json.length; i < l; i++) {
        const part = json[i];
        if (!node) {
            if (typeof part === 'string') {
                const match = part.match(TAG_MATCH);
                const tag = match ? match[0] : "div";
                node = document.createElement(tag);
                first = true;
                const classes = part.match(CLASS_MATCH);
                if (classes)
                    node.setAttribute('class', classes.map(stripFirst).join(' '));
                const id = part.match(ID_MATCH);
                if (id)
                    node.setAttribute('id', id[0].substr(1));
                if (refs) {
                    const ref = part.match(REF_MATCH);
                    if (ref)
                        refs[ref[0].substr(1)] = node;
                }
                continue;
            }
            else if (typeof part === "function") {
                return domBuilder(part.apply(null, json.slice(i + 1)), refs);
            }
            else {
                node = document.createDocumentFragment();
            }
        }
        if (first && typeof part === 'object' && part.constructor === Object) {
            setAttrs(node, part);
        }
        else {
            node.appendChild(domBuilder(part, refs));
        }
        first = false;
    }
    if (!node)
        throw new Error("No node created");
    return node;
}
function setAttrs(node, attrs) {
    const keys = Object.keys(attrs);
    for (const key of keys) {
        const value = attrs[key];
        if (key === "$") {
            value(node);
        }
        else if (key === "css" || key === "style" && value.constructor === Object) {
            setStyle(node.style, value);
        }
        else if (key.substr(0, 2) === "on") {
            node.addEventListener(key.substr(2), value, false);
        }
        else if (typeof value === "boolean") {
            if (value)
                node.setAttribute(key, key);
        }
        else {
            node.setAttribute(key, value);
        }
    }
}
function setStyle(style, attrs) {
    for (const key of Object.keys(attrs)) {
        style[key] = attrs[key];
    }
}
function stripFirst(part) {
    return part.substr(1);
}
//# sourceMappingURL=dombuilder.js.map