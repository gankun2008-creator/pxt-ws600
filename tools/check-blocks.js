// Compile a representative consumer and decompile it into real MakeCode block XML.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const cli = require('pxt-core');
const compiler = global.ts.pxtc;
const originalCompile = compiler.compile;
let checked = 0;
compiler.compile = function (opts) {
    const filename = 'blocks-smoke.ts';
    if (!opts.fileSystem['ws600.ts']) return originalCompile(opts);
    opts.ast = true;
    opts.fileSystem[filename] = `
let blocksStrip = ws600.create(DigitalPin.P0, 600, ws600.ColorOrder.GRB)
blocksStrip.setBrightness(64)
blocksStrip.clear()
blocksStrip.setPixelColor(599, ws600.rgb(0, 255, 0))
blocksStrip.setPixelRGB(0, 255, 0, 0)
blocksStrip.fill(ws600.rgb(1, 2, 3))
blocksStrip.fillRGB(1, 2, 3)
blocksStrip.rangeFill(590, 50, ws600.rgb(1, 2, 3))
blocksStrip.setRangeRGB(500, 100, 1, 2, 3)
blocksStrip.rotate(1)
blocksStrip.shift(-1)
blocksStrip.setHue(599, 120)
blocksStrip.rainbow(0, 360)
let blocksLength = blocksStrip.length()
let blocksColor = blocksStrip.getPixelColor(599)
blocksStrip.show()
`;
    opts.sourceFiles.push(filename);
    const result = originalCompile(opts);
    assert(result.success, JSON.stringify(result.diagnostics));
    const blocks = compiler.decompile(result.ast, opts, filename);
    assert(blocks.success, JSON.stringify(blocks.diagnostics));
    const xml = blocks.outfiles['blocks-smoke.blocks'];
    assert(xml && !xml.includes('ts_statement') && !xml.includes('ts_expression'), 'no grey JS blocks');
    const ids = ['create', 'brightness', 'clear', 'set_pixel', 'rgb', 'set_rgb', 'fill',
        'fill_rgb', 'range_fill', 'range_rgb', 'rotate', 'shift', 'hue', 'rainbow', 'length', 'get_pixel', 'show'];
    for (const id of ids) assert(xml.includes(`type="ws600_${id}"`), `missing block ${id}`);
    const info = compiler.getApiInfo(result.ast);
    const locale = JSON.parse(fs.readFileSync('_locales/ja/ws600-strings.json', 'utf8'));
    for (const key of Object.keys(locale).filter(key => key.endsWith('|block'))) {
        const symbol = info.byQName[key.slice(0, -6)];
        assert(symbol && symbol.attributes.block, `missing localized API ${key}`);
        const tokens = text => (text.match(/[%$][A-Za-z][A-Za-z0-9_]*/g) || []).sort();
        assert.deepEqual(tokens(locale[key]), tokens(symbol.attributes.block), `localized params ${key}`);
    }
    fs.mkdirSync('built', { recursive: true });
    fs.writeFileSync('built/blocks-smoke.blocks', xml);
    checked++;
    console.log('PASS: 17 custom Blocks, no grey JavaScript blocks, Japanese placeholders match');
    return result;
};
process.on('exit', code => { if (!code && !checked) process.exitCode = 1; });
cli.mainCli(path.dirname(require.resolve('pxt-microbit/package.json')), ['build', '--cloud']);
