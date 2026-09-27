/** RGB LED control using one reusable wire buffer. No operation sends except show(). */
//% color=#167A80 icon="\uf0eb" block="WS2812 600" weight=80
namespace ws600 {
    export const MAX_LEDS = 600
    const BYTES_PER_PIXEL = 3
    const DEFAULT_BRIGHTNESS = 64
    // Covers WS2812B variants requiring a reset longer than 280 us.
    const RESET_MICROS = 300

    export enum ColorOrder {
        //% block="GRB (WS2812B)"
        GRB = 0,
        //% block="RGB"
        RGB = 1,
        //% block="BRG"
        BRG = 2,
        //% block="RBG"
        RBG = 3,
        //% block="GBR"
        GBR = 4,
        //% block="BGR"
        BGR = 5
    }

    // Reject NaN and both infinities before integer conversion or indexing.
    function finite(value: number): boolean {
        return value - value === 0
    }

    function channel(value: number): number {
        if (!finite(value) || value <= 0) return 0
        if (value >= 255) return 255
        return Math.floor(value)
    }

    /** Pack clamped 0..255 channels into a 24-bit RGB color. */
    //% blockId=ws600_rgb block="red %r green %g blue %b" weight=80
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    export function rgb(r: number, g: number, b: number): number {
        return (channel(r) << 16) | (channel(g) << 8) | channel(b)
    }

    /** Create a dark buffer. Does not transmit; call clear() then show() to turn off hardware.
     * @param pin LED data pin
     * @param count number of LEDs, eg: 600
     * @param order byte order used by the LED hardware
     */
    //% blockId=ws600_create block="WS2812 pin %pin LEDs %count || order %order" weight=100
    //% blockSetVariable=strip count.min=1 count.max=600 count.defl=600 pin.defl=DigitalPin.P0
    export function create(pin: DigitalPin, count: number, order: ColorOrder = ColorOrder.GRB): Strip {
        if (!finite(count)) count = 1
        count = Math.max(1, Math.min(MAX_LEDS, Math.floor(count)))
        return new Strip(pin, count, order)
    }

    export class Strip {
        private buf: Buffer
        private pin: DigitalPin
        private count: number
        private brightness: number
        private redOffset: number
        private greenOffset: number
        private blueOffset: number

        // Use create() from user programs. Constructor also validates for JS callers.
        constructor(pin: DigitalPin, count: number, order: ColorOrder) {
            if (!finite(count)) count = 1
            this.count = Math.max(1, Math.min(MAX_LEDS, Math.floor(count)))
            this.pin = pin
            this.brightness = DEFAULT_BRIGHTNESS
            this.redOffset = 1
            this.greenOffset = 0
            this.blueOffset = 2
            switch (order) {
                case ColorOrder.RGB:
                    this.redOffset = 0; this.greenOffset = 1; this.blueOffset = 2
                    break
                case ColorOrder.BRG:
                    this.redOffset = 1; this.greenOffset = 2; this.blueOffset = 0
                    break
                case ColorOrder.RBG:
                    this.redOffset = 0; this.greenOffset = 2; this.blueOffset = 1
                    break
                case ColorOrder.GBR:
                    this.redOffset = 2; this.greenOffset = 0; this.blueOffset = 1
                    break
                case ColorOrder.BGR:
                    this.redOffset = 2; this.greenOffset = 1; this.blueOffset = 0
                    break
            }
            // The only pixel-data allocation in this library.
            this.buf = pins.createBuffer(this.count * BYTES_PER_PIXEL)
            this.buf.fill(0)
            pins.digitalWritePin(this.pin, 0)
        }

        /** Number of addressable LEDs. */
        //% blockId=ws600_length block="%strip length" weight=30
        //% strip.defl=strip
        length(): number {
            return this.count
        }

        /** Wire buffer size, in bytes. Does not expose or copy the buffer. */
        byteLength(): number {
            return this.buf.length
        }

        /** Read the stored (already brightness-scaled) RGB value. Invalid index returns black. */
        //% blockId=ws600_get_pixel block="%strip stored color at %index" weight=25 advanced=true
        //% strip.defl=strip index.min=0 index.max=599
        getPixelColor(index: number): number {
            if (!finite(index) || index < 0 || index >= this.count) return 0
            const offset = Math.floor(index) * BYTES_PER_PIXEL
            return (this.buf[offset + this.redOffset] << 16)
                | (this.buf[offset + this.greenOffset] << 8)
                | this.buf[offset + this.blueOffset]
        }

        /** Change brightness for FUTURE writes only. Existing pixels must be repainted. */
        //% blockId=ws600_brightness block="%strip brightness %brightness" weight=55
        //% strip.defl=strip brightness.min=0 brightness.max=255 brightness.defl=64
        setBrightness(brightness: number): void {
            this.brightness = channel(brightness)
        }

        /** Set a pixel in the buffer. Call show() to transmit. */
        //% blockId=ws600_set_pixel block="%strip LED %index color %color" weight=90
        //% strip.defl=strip index.min=0 index.max=599 color.shadow=ws600_rgb
        setPixelColor(index: number, color: number): void {
            this.setPixelRGB(index, (color >> 16) & 255, (color >> 8) & 255, color & 255)
        }

        /** Set clamped RGB channels. Indices outside 0..length-1 are ignored. */
        //% blockId=ws600_set_rgb block="%strip LED %index red %r green %g blue %b" weight=89
        //% strip.defl=strip index.min=0 index.max=599
        //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
        setPixelRGB(index: number, r: number, g: number, b: number): void {
            if (!finite(index) || index < 0 || index >= this.count) return
            this.writeRGB(Math.floor(index) * BYTES_PER_PIXEL,
                this.scale(r), this.scale(g), this.scale(b))
        }

        /** Fill the entire buffer. Call show() to transmit. */
        //% blockId=ws600_fill block="%strip fill color %color" weight=75
        //% strip.defl=strip color.shadow=ws600_rgb
        fill(color: number): void {
            this.rangeFill(0, this.count, color)
        }

        /** Fill all pixels with RGB channels. */
        //% blockId=ws600_fill_rgb block="%strip fill red %r green %g blue %b" weight=74
        //% strip.defl=strip r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
        fillRGB(r: number, g: number, b: number): void {
            this.setRangeRGB(0, this.count, r, g, b)
        }

        /** Fill the intersection of [start, start+length) and the strip. */
        //% blockId=ws600_range_fill block="%strip from %start count %length color %color" weight=70
        //% strip.defl=strip start.min=0 start.max=599 length.min=0 length.max=600 color.shadow=ws600_rgb
        rangeFill(start: number, length: number, color: number): void {
            this.setRangeRGB(start, length, (color >> 16) & 255, (color >> 8) & 255, color & 255)
        }

        /** Fill a clipped range. Negative/zero length or non-finite arguments do nothing. */
        //% blockId=ws600_range_rgb block="%strip from %start count %length red %r green %g blue %b" weight=69
        //% strip.defl=strip start.min=0 start.max=599 length.min=0 length.max=600
        //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
        setRangeRGB(start: number, length: number, r: number, g: number, b: number): void {
            if (!finite(start) || !finite(length) || length <= 0) return
            start = Math.floor(start)
            length = Math.floor(length)
            const end = Math.min(this.count, start + length)
            start = Math.max(0, start)
            if (start >= end) return
            r = this.scale(r)
            g = this.scale(g)
            b = this.scale(b)
            const endOffset = end * BYTES_PER_PIXEL
            for (let offset = start * BYTES_PER_PIXEL; offset < endOffset; offset += BYTES_PER_PIXEL) {
                this.writeRGB(offset, r, g, b)
            }
        }

        /** Clear the buffer without transmitting. */
        //% blockId=ws600_clear block="%strip clear" weight=60
        //% strip.defl=strip
        clear(): void {
            this.buf.fill(0)
        }

        /** Transmit the existing full buffer exactly once, then allow the LEDs to latch. */
        //% blockId=ws600_show block="%strip show" weight=95
        //% strip.defl=strip
        show(): void {
            // The target driver supplies the initial low reset. Keep a trailing reset too.
            ws2812b.sendBuffer(this.buf, this.pin)
            control.waitMicros(RESET_MICROS)
        }

        /** Move pixels toward higher indices for positive amounts; vacated pixels turn black. */
        //% blockId=ws600_shift block="%strip shift %amount LEDs" weight=40 advanced=true
        //% strip.defl=strip amount.defl=1
        shift(amount: number = 1): void {
            if (!finite(amount)) return
            amount = Math.floor(amount)
            if (amount === 0) return
            if (amount >= this.count || amount <= -this.count) {
                this.clear()
                return
            }
            const bytes = amount * BYTES_PER_PIXEL
            if (bytes > 0) {
                for (let i = this.buf.length - 1; i >= bytes; i--) this.buf[i] = this.buf[i - bytes]
                this.buf.fill(0, 0, bytes)
            } else {
                for (let i = 0; i < this.buf.length + bytes; i++) this.buf[i] = this.buf[i - bytes]
                this.buf.fill(0, this.buf.length + bytes, -bytes)
            }
        }

        /** Circular rotation toward higher indices for positive amounts, using scalar scratch only. */
        //% blockId=ws600_rotate block="%strip rotate %amount LEDs" weight=39 advanced=true
        //% strip.defl=strip amount.defl=1
        rotate(amount: number = 1): void {
            if (!finite(amount)) return
            amount = Math.floor(amount) % this.count
            if (amount < 0) amount += this.count
            if (amount === 0) return
            this.reversePixels(0, this.count - 1)
            this.reversePixels(0, amount - 1)
            this.reversePixels(amount, this.count - 1)
        }

        /** Set a fully saturated hue in degrees (0 red, 120 green, 240 blue). */
        //% blockId=ws600_hue block="%strip LED %index hue %hue" weight=38 advanced=true
        //% strip.defl=strip index.min=0 index.max=599 hue.min=0 hue.max=360
        setHue(index: number, hue: number): void {
            if (!finite(hue)) return
            hue = ((hue % 360) + 360) % 360
            const section = Math.floor(hue / 60)
            const up = Math.floor((hue - section * 60) * 255 / 60)
            const down = 255 - up
            switch (section) {
                case 0: this.setPixelRGB(index, 255, up, 0); break
                case 1: this.setPixelRGB(index, down, 255, 0); break
                case 2: this.setPixelRGB(index, 0, 255, up); break
                case 3: this.setPixelRGB(index, 0, down, 255); break
                case 4: this.setPixelRGB(index, up, 0, 255); break
                case 5: this.setPixelRGB(index, 255, 0, down); break
            }
        }

        /** Interpolate the supplied hue interval, including both endpoints. Does not transmit. */
        //% blockId=ws600_rainbow block="%strip rainbow from hue %startHue to %endHue" weight=37 advanced=true
        //% strip.defl=strip startHue.defl=0 endHue.defl=360
        rainbow(startHue: number = 0, endHue: number = 360): void {
            if (!finite(startHue) || !finite(endHue) || !finite(endHue - startHue)) return
            if (this.count === 1) {
                this.setHue(0, startHue)
                return
            }
            for (let i = 0; i < this.count; i++) {
                this.setHue(i, startHue + (endHue - startHue) * (i / (this.count - 1)))
            }
        }

        private scale(value: number): number {
            return Math.idiv(channel(value) * this.brightness, 255)
        }

        private writeRGB(offset: number, r: number, g: number, b: number): void {
            this.buf[offset + this.redOffset] = r
            this.buf[offset + this.greenOffset] = g
            this.buf[offset + this.blueOffset] = b
        }

        private reversePixels(first: number, last: number): void {
            while (first < last) {
                const left = first * BYTES_PER_PIXEL
                const right = last * BYTES_PER_PIXEL
                for (let c = 0; c < BYTES_PER_PIXEL; c++) {
                    const value = this.buf[left + c]
                    this.buf[left + c] = this.buf[right + c]
                    this.buf[right + c] = value
                }
                first++
                last--
            }
        }
    }
}
