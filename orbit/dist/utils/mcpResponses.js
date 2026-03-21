"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.json = json;
function ok(text) {
    return {
        content: [{ type: "text", text }],
    };
}
function json(data) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2),
            },
        ],
    };
}
