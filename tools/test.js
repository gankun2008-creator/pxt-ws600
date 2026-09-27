// Node is used only for development tests; this file is never included by PXT.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const files = ['tools/host.d.ts', 'ws600.ts', 'test.ts'].map(f => path.join(root, f));
const options = { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None,
    strict: true, types: [], outFile: 'host.js', skipLibCheck: true };
const program = ts.createProgram(files, options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n'
    }));
    process.exit(1);
}
let source = '';
program.emit(undefined, (name, text) => { if (name.endsWith('.js')) source = text; });
let allocations = 0;
let sends = 0;
let lastBuffer;
let lastPin;
let checks = 0;
const waits = [];
function checkedBuffer(length) {
    assert(Number.isInteger(length) && length > 0 && length <= 1800);
    allocations++;
    const bytes = new Uint8Array(length);
    return new Proxy(bytes, {
        get(target, property) {
            if (property === 'length') return target.length;
            if (property === 'fill') return (value, offset = 0, count = target.length - offset) => {
                assert(offset >= 0 && count >= 0 && offset + count <= target.length);
                target.fill(value, offset, offset + count);
            };
            if (typeof property === 'string' && /^-?\d/.test(property)) {
                const index = Number(property);
                assert(Number.isInteger(index) && index >= 0 && index < length, `read ${index}/${length}`);
            }
            return target[property];
        },
        set(target, property, value) {
            const index = Number(property);
            assert(Number.isInteger(index) && index >= 0 && index < length, `write ${index}/${length}`);
            assert(Number.isInteger(value) && value >= 0 && value <= 255);
            target[index] = value;
            return true;
        }
    });
}
const math = Object.create(Math);
math.idiv = (a, b) => Math.trunc(a / b);
const context = vm.createContext({ Math: math, DigitalPin: { P0: 7, P1: 8 },
    pins: { createBuffer: checkedBuffer, digitalWritePin: () => {} },
    control: { assert: (condition, message) => { checks++; assert(condition, message); },
        waitMicros: us => waits.push(us) },
    ws2812b: { sendBuffer: (buffer, pin) => { sends++; lastBuffer = buffer; lastPin = pin; } }
});
vm.runInContext(source, context);
const api = context.ws600;
const strip = api.create(7, 600);
assert.equal(strip.byteLength(), 1800);
const buffer = strip.buf; // Runtime inspection only. No public mutable buffer accessor.
const beforeCreateSends = sends;
assert.equal(beforeCreateSends, 3, 'only test.ts show calls should have sent');
strip.clear();
strip.show();
assert.equal(sends, beforeCreateSends + 1);
assert.strictEqual(lastBuffer, buffer);
assert.equal(lastPin, 7);
strip.setPixelRGB(599, 0, 255, 0);
for (let i = 0; i < 1797; i++) assert.equal(buffer[i], 0, `preceding byte ${i}`);
assert.deepEqual([buffer[1797], buffer[1798], buffer[1799]], [64, 0, 0]);
strip.show();
assert.equal(sends, beforeCreateSends + 2);
assert.strictEqual(lastBuffer, buffer);
for (let i = 0; i < 1797; i++) assert.equal(buffer[i], 0, `after show preceding byte ${i}`);
assert.deepEqual([buffer[1797], buffer[1798], buffer[1799]], [64, 0, 0]);
const before = allocations;
const beforeSends = sends;
strip.setBrightness(255);
for (let frame = 0; frame < 1000; frame++) {
    strip.clear(); strip.setPixelRGB(599, 0, 255, 0); strip.rotate(5); strip.shift(-5);
    strip.rangeFill(590, 50, 0x123456); strip.show();
    assert.strictEqual(lastBuffer, buffer);
    assert.equal(lastBuffer.length, 1800);
}
strip.rainbow(0, 360);
assert.equal(allocations, before, 'no pixel allocations after create');
assert.equal(sends - beforeSends, 1000, 'exactly one send per show');
assert(waits.every(us => us >= 300), 'reset low interval');

const layouts = [[2, 1, 3], [1, 2, 3], [3, 1, 2], [1, 3, 2], [2, 3, 1], [3, 2, 1]];
layouts.forEach((expected, order) => {
    const s = api.create(7, 1, order);
    s.setBrightness(255); s.setPixelRGB(0, 1, 2, 3);
    assert.deepEqual([s.buf[0], s.buf[1], s.buf[2]], expected);
});
for (const value of [NaN, Infinity, -Infinity, -1, -0.5, 600, 2 ** 32, 1e100]) {
    strip.clear(); strip.setPixelRGB(value, 255, 255, 255);
    for (let i = 0; i < 600; i++) assert.equal(strip.getPixelColor(i), 0);
}
for (const start of [-1000, -1, 0, 1, 590, 599, 600, 1000, NaN, Infinity, -Infinity]) {
    for (const length of [-1000, -1, 0, 1, 10, 50, 600, 1000, NaN, Infinity, -Infinity]) {
        strip.clear(); strip.rangeFill(start, length, 0x123456);
        for (let i = 0; i < 600; i++) {
            const expected = Number.isFinite(start) && Number.isFinite(length) && length > 0
                && i >= start && i < start + length ? 0x123456 : 0;
            assert.equal(strip.getPixelColor(i), expected);
        }
    }
}
// Independent array oracle is confined to the host, never shipped onto micro:bit.
for (const amount of [-1201, -600, -599, -1, 0, 1, 599, 600, 1201]) {
    const expected = Array.from({ length: 600 }, (_, i) => i + 1);
    for (let i = 0; i < 600; i++) strip.setPixelColor(i, expected[i]);
    strip.rotate(amount);
    for (let i = 0; i < 600; i++) assert.equal(strip.getPixelColor(i), expected[((i - amount) % 600 + 600) % 600]);
    for (let i = 0; i < 600; i++) strip.setPixelColor(i, expected[i]);
    strip.shift(amount);
    for (let i = 0; i < 600; i++) assert.equal(strip.getPixelColor(i), expected[i - amount] || 0);
}
for (const [input, count] of [[-1, 1], [0, 1], [1, 1], [599.9, 599], [600, 600], [601, 600], [NaN, 1], [Infinity, 1]]) {
    assert.equal(api.create(7, input).length(), count);
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'pxt.json'), 'utf8'));
for (const file of [...config.files, ...config.testFiles]) assert(fs.existsSync(path.join(root, file)), file);
const locale = JSON.parse(fs.readFileSync(path.join(root, '_locales/ja/ws600-strings.json'), 'utf8'));
assert.equal(Object.keys(locale).filter(k => k.endsWith('|block')).length, 17);
console.log(`PASS: strict TypeScript, ${checks} PXT assertions, raw bytes, 121 range cases, 1000 frames, 6 orders, rotation/shift oracle`);
