// PXT test entry point. Imported extensions exclude this file via testFiles.
// Run without physical LEDs attached: some tests deliberately use brightness 255.
namespace ws600Tests {
    function equal(actual: number, expected: number, message: string): void {
        control.assert(actual === expected, message)
    }

    function expectOnly(strip: ws600.Strip, index: number, color: number): void {
        for (let i = 0; i < strip.length(); i++) {
            equal(strip.getPixelColor(i), i === index ? color : 0, "unexpected pixel")
        }
    }

    export function run(): void {
        const strip = ws600.create(DigitalPin.P0, 600)
        equal(strip.length(), 600, "LED count")
        equal(strip.byteLength(), 1800, "wire buffer bytes")

        // Exact requested regression, at default brightness 64.
        strip.clear()
        strip.show()
        strip.setPixelRGB(599, 0, 255, 0)
        strip.show()
        expectOnly(strip, 599, ws600.rgb(0, 64, 0))

        strip.setBrightness(255)
        strip.clear()
        strip.setPixelColor(0, ws600.rgb(255, 0, 0))
        expectOnly(strip, 0, 0xff0000)
        strip.clear()
        strip.setPixelRGB(599, 0, 255, 0)
        expectOnly(strip, 599, 0x00ff00)
        strip.setPixelColor(0, 0xff0000)
        equal(strip.getPixelColor(0), 0xff0000, "first pixel")
        equal(strip.getPixelColor(599), 0x00ff00, "last pixel")
        for (let i = 1; i < 599; i++) equal(strip.getPixelColor(i), 0, "middle unchanged")

        strip.fill(0x123456)
        for (let i = 0; i < 600; i++) equal(strip.getPixelColor(i), 0x123456, "fill")
        strip.clear()
        expectOnly(strip, -1, 0)
        strip.rangeFill(0, 600, 0xabcdef)
        for (let i = 0; i < 600; i++) equal(strip.getPixelColor(i), 0xabcdef, "full range")
        strip.clear()
        strip.rangeFill(599, 1, 0x00ff00)
        expectOnly(strip, 599, 0x00ff00)
        strip.clear()
        strip.rangeFill(590, 50, 0x112233)
        for (let i = 0; i < 600; i++) equal(strip.getPixelColor(i), i < 590 ? 0 : 0x112233, "clipped end")

        strip.clear()
        strip.setPixelColor(-1, 0xffffff)
        strip.setPixelColor(600, 0xffffff)
        strip.setPixelRGB(-0.5, 255, 255, 255)
        strip.setPixelColor(4294967296, 0xffffff)
        strip.rangeFill(600, 1, 0xffffff)
        strip.rangeFill(0, -1, 0xffffff)
        strip.rangeFill(0, 0, 0xffffff)
        expectOnly(strip, -1, 0)
        strip.rangeFill(-5, 6, 0xff0000)
        expectOnly(strip, 0, 0xff0000)

        strip.setBrightness(0)
        strip.fill(0xffffff)
        expectOnly(strip, -1, 0)
        strip.setBrightness(255)
        strip.fillRGB(255, 255, 255)
        for (let i = 0; i < 600; i++) equal(strip.getPixelColor(i), 0xffffff, "brightness 255")
        strip.setBrightness(64)
        equal(strip.getPixelColor(599), 0xffffff, "brightness applies to future writes")
        strip.fillRGB(255, 128, 0)
        equal(strip.getPixelColor(599), 0x402000, "brightness scaling")
        strip.setBrightness(255)
        strip.setRangeRGB(599, 100, 1, 2, 3)
        equal(strip.getPixelColor(599), 0x010203, "range RGB")
        equal(ws600.rgb(-10, 256, 12.9), 0x00ff0c, "RGB channel clamp")

        const rgbStrip = ws600.create(DigitalPin.P1, 1, ws600.ColorOrder.RGB)
        rgbStrip.setBrightness(255)
        rgbStrip.setPixelRGB(0, 1, 2, 3)
        equal(rgbStrip.getPixelColor(0), 0x010203, "RGB order readback")
        // Host tests additionally inspect raw GRB/RGB bytes and instrument sendBuffer.

        strip.clear()
        strip.setPixelRGB(599, 1, 2, 3)
        strip.rotate(1)
        expectOnly(strip, 0, 0x010203)
        strip.rotate(-1)
        expectOnly(strip, 599, 0x010203)
        strip.shift(-599)
        expectOnly(strip, 0, 0x010203)
        strip.shift(599)
        expectOnly(strip, 599, 0x010203)
        strip.shift(600)
        expectOnly(strip, -1, 0)
        strip.setHue(599, 120)
        expectOnly(strip, 599, 0x00ff00)
        strip.rainbow(0, 240)
        equal(strip.getPixelColor(0), 0xff0000, "rainbow first")
        equal(strip.getPixelColor(599), 0x0000ff, "rainbow last")
        rgbStrip.rainbow(120, 240)
        equal(rgbStrip.getPixelColor(0), 0x00ff00, "single LED rainbow")
        strip.clear()
        strip.show()
    }
}
ws600Tests.run()
