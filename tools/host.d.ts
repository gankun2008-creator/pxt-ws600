// Minimal host-only declarations. PXT uses its real core declarations instead.
interface Buffer {
    readonly length: number;
    [index: number]: number;
    fill(value: number, offset?: number, length?: number): void;
}
declare enum DigitalPin { P0 = 7, P1 = 8 }
declare namespace pins {
    function createBuffer(length: number): Buffer;
    function digitalWritePin(pin: DigitalPin, value: number): void;
}
declare namespace control {
    function assert(condition: boolean, message?: string): void;
    function waitMicros(microseconds: number): void;
}
declare namespace ws2812b {
    function sendBuffer(buffer: Buffer, pin: DigitalPin): void;
}
interface Math { idiv(a: number, b: number): number; }
