# WS2812 600 — MakeCode for micro:bit

1本のデータ線で1～600個のWS2812 / WS2812B / NeoPixel互換RGB LEDを制御する拡張です。
主対象はmicro:bit V2。namespaceは `ws600`、ブロックカテゴリは **WS2812 600** です。
GRB（既定）、RGB、BRG、RBG、GBR、BGRに対応します。RGBWは対象外です。

## 最初に：600個の電源

**micro:bitの3V端子、micro:bitのUSB端子から600個のLEDを給電してはいけません。**

LED用に外部の安定化5V電源を使用してください。従来の最大60mA/LEDで見積もると、
`600 × 0.06A = 36A`、`5V × 36A = 180W`です。実際の最大電流はLEDの世代・製品で異なります。
実製品のデータシート、配線、コネクタ、保護部品を含めて電源容量を決めてください。

- LED用電源とmicro:bitの **GNDを共通化** します。外部5Vをmicro:bitの3V端子に接続しません。
- micro:bitは3.3Vロジックです。5V駆動LEDへの確実な信号入力には、5Vで動作させた
  **74AHCT125 / 74HCT245** など、3.3V入力をHIGHとして受けられるレベルシフタを推奨します。
  型番の似た74HCシリーズを無条件に代用しないでください。方向と出力許可を正しく設定します。
- LED先頭のDIN付近に **330～470Ω** 程度の直列抵抗を配置します。
- LED電源入力付近に **500～1000µF程度を出発点とする大容量コンデンサ** を配置します。
  5Vに余裕のある耐圧と正しい極性が必要です。レベルシフタにも適切なデカップリングを設けます。
- 600個では電圧降下が大きくなります。両端や途中の適切な箇所から **5VとGNDの両方を電源注入**
  してください。注入位置・本数・配線太さはLED、電流、長さ、配置に依存し、一律には決まりません。
- 大電流はブレッドボードや細いジャンパ線に流しません。分岐配線とヒューズ等を電流に合わせて設計します。
- 初期輝度64でも600個の白は大電流になり得ます。輝度設定はヒューズや電流制限回路の代わりにはなりません。

```text
micro:bit P0 → 74AHCT125（5V駆動）→ 330～470Ω → WS2812B DIN
External 5V PSU + ─────────────────────────→ WS2812B 5V
External PSU GND ──→ WS2812B GND ──→ micro:bit GND
                  └→ レベルシフタ GND
```

micro:bit自体は適切なUSB/電池で給電します。LED600個分の電力は外部電源から供給します。
配線の参考：[Adafruit NeoPixel電源・信号の推奨構成](https://learn.adafruit.com/adafruit-neopixel-uberguide/best-practices)。

## GitHubからインポート

MakeCodeの新しいmicro:bitプロジェクトで「拡張機能」を開き、次のURLを貼り付けます。

**https://github.com/gankun2008-creator/pxt-ws600**

初回リリースは `v1.0.0` です。pxt.jsonでバージョンを指定する場合は、
`"ws600": "github:gankun2008-creator/pxt-ws600#v1.0.0"` をdependenciesに追加します。

`pxt.json` は公式 `github:microsoft/pxt-ws2812b#v0.1.2` に依存します。
開発用のNode.jsやnpmは、MakeCode利用者には不要です。
日本語エディタでは `_locales/ja/ws600-strings.json` のブロック名を使用します。

## 最小例：599番だけ緑

```typescript
let strip = ws600.create(DigitalPin.P0, 600)
strip.clear()
strip.show()
strip.setPixelRGB(599, 0, 255, 0)
strip.show()
```

番号は **0～599**。599番は物理的な600個目です。初期輝度64なので保存されるGRBは `[64, 0, 0]`。
バイト0～1796はすべて0で、最後の3バイト1797～1799だけを更新します。
255の緑を送るには、色を書き込む **前に** `strip.setBrightness(255)` を呼びます。

`create()` はゼロで初期化したBufferを作り、データピンをLOWにします。LEDデータは送信しません。
すでに点灯しているLEDの状態は `clear(); show()` を実行するまで残る場合があります。

## API

| API | 動作 |
| --- | --- |
| `create(pin, count, order = ws600.ColorOrder.GRB)` | 1～600個のストリップ作成。初期輝度64 |
| `rgb(r, g, b)` | 24bit `0xRRGGBB` を返す |
| `setPixelColor(index, color)` | 1個の色を書き込む |
| `setPixelRGB(index, r, g, b)` | RGB値で1個を書き込む |
| `fill(color)` / `fillRGB(r, g, b)` | 全体を書き込む |
| `rangeFill(start, length, color)` | 指定範囲を書き込む |
| `setRangeRGB(start, length, r, g, b)` | RGBで指定範囲を書き込む |
| `setBrightness(brightness)` | **以後の色書き込み** の輝度。0～255 |
| `clear()` | Bufferを0にする。送信しない |
| `show()` | 既存Buffer全体を公式ドライバに1回渡し、ラッチ待ちを行う |
| `length()` / `byteLength()` | LED数 / ピクセルBufferのバイト数 |
| `getPixelColor(index)` | 保存中の輝度適用済みRGB色。範囲外なら0 |
| `rotate(amount = 1)` | 正で番号の大きい側へ循環移動。負で逆方向 |
| `shift(amount = 1)` | 正で番号の大きい側へ移動。空いた部分は0 |
| `setHue(index, hue)` | 色相（度）で設定。0=赤、120=緑、240=青 |
| `rainbow(startHue = 0, endHue = 360)` | 両端を含む色相の直線補間。1個なら開始色相 |

`show()` 以外は送信しません。複数の変更をまとめてから1回送信してください。
同じピンを複数のストリップや音声・タッチ等から同時に操作しないでください。

### 入力と境界

- LED数は小数点以下を切り捨て、1～600に制限。NaN/無限大は1にします。
- indexはまず範囲と有限性を確認し、有効範囲内の小数だけを切り捨てます。
  負値（-0.5も含む）、600以上、NaN、無限大は無視します。
- 範囲のstart/lengthは整数に切り捨て、`[start, start + length)` と `[0, LED数)` の交差を処理します。
  `rangeFill(590, 50, ...)` は590～599、`rangeFill(-5, 6, ...)` は0だけ。
  lengthが0以下、またはstart/lengthが非有限なら何もしません。
- RGBチャンネルと輝度は0～255に制限し、小数点以下を切り捨てます。非有限値は0です。
- rotate/shiftの量も切り捨てます。非有限は無視。shiftの絶対量がLED数以上なら全消去します。
- 色順は作成時に固定します。未知のenum値はGRBになります。RGBWデータは送れません。

### 輝度とRAM

ピクセルデータは **3 × LED数バイト**。600個なら **1800バイト（約1.76KiB）** のBuffer **1本** です。
これに小さなStripオブジェクトとBuffer管理領域、MakeCodeランタイム、スタック等が必要です。
1800バイトはプログラム全体のRAM使用量ではありません。

色を書き込む時点で `floor(channel × brightness / 255)` を適用します。
輝度255では元値を保持し、0では0になります。公式NeoPixel同様に輝度変更は既存色へ遡及しません。
原色のバックアップを保存しないため、輝度を変えたらfill/rainbow/アニメーションの描画をやり直してください。
`setBrightness(0); show()` だけで既存点灯を消せるわけではありません。消灯には `clear(); show()` を使います。

`show()`、範囲操作、shift、rotateはピクセルBufferを作り直しません。
rotateはその場の入れ替え、shiftは上書き方向を選んだコピーを行い、補助のLED配列は不要です。
ユーザーコードでもアニメーションループの外で1回だけ `create()` を呼んでください。

## 送信時間とV1/V2

800kHz公称値では1bitが約1.25µs、600個のRGBは `600 × 24 × 1.25µs = 18ms` です。
これにリセットと処理時間が必要で、**600個を1本のチェーンで60FPSにはできません**。
データ部分だけの上限は約55.6FPS。リセットを含めると約55FPS未満になります。
現行公式ドライバの送信前300µsと本拡張の送信後300µsを合わせると、公称値換算で約18.6ms以上が目安です。
実際の信号周期はドライバ・0/1の比率で変わり、描画・ランタイム処理も加わります。正確な時間は実測してください。
大規模アニメーションではまず20～30FPS程度を目安に実機で調整します。

- **V2が主対象**。MakeCodeのCODAL/nRF52用ネイティブ送信に接続します。
- **V1は可能な範囲の対応**。V2専用APIは使用しませんが、V1のRAMは16KiB、V2は128KiBです。
  V1ではほかの拡張、無線、文字列、画像などによって600個分の確保やコード容量が不足し得ます。
  OOM（020等）や容量超過の場合はLED数・機能を減らすかV2を使用してください。
- ソフトウェア検証と実機検証は別です。600個の物理チェーン、信号品質、電源、割り込みへの影響は実機確認が必要です。
- **Bluetoothとの同時使用は対応範囲外**。依存する公式拡張はBLEを無効化する設定を含みます。
  現行ドライバは波形送信中に割り込みを禁止します。Bluetooth拡張の追加・設定変更で同時動作を保証できません。
  radio、音声、タイマー等も送信中の長い割り込み禁止の影響を受け得るため、組合せごとに確認してください。

ハードウェア仕様：[micro:bit V1/V2の比較](https://tech.microbit.org/hardware/)。

## 600個の実機テスト

テストは別々のプログラムとして実行します。電源と配線を確認し、低輝度から始めてください。
テスト1は上の「599番だけ緑」の最小例です。

### テスト2：赤、緑、青を順に1個ずつ流す

```typescript
let strip = ws600.create(DigitalPin.P0, 600)
strip.setBrightness(32)
basic.forever(function () {
    for (let channel = 0; channel < 3; channel++) {
        strip.clear()
        for (let i = 0; i < strip.length(); i++) {
            if (i > 0) strip.setPixelRGB(i - 1, 0, 0, 0)
            strip.setPixelRGB(i, channel == 0 ? 255 : 0,
                channel == 1 ? 255 : 0, channel == 2 ? 255 : 0)
            strip.show()
            basic.pause(20)
        }
    }
})
```

1フレームごとに送信しますが、毎回1800バイト全部を1回で送ります。ピクセル単位の送信もBuffer再作成も行いません。

### テスト3：600個全体にレインボー

```typescript
let strip = ws600.create(DigitalPin.P0, 600)
strip.setBrightness(16)
strip.rainbow(0, 360)
strip.show()
```

### テスト4：100個ごとに色分け

```typescript
let strip = ws600.create(DigitalPin.P0, 600)
strip.setBrightness(16)
strip.rangeFill(0, 100, ws600.rgb(255, 0, 0))
strip.rangeFill(100, 100, ws600.rgb(0, 255, 0))
strip.rangeFill(200, 100, ws600.rgb(0, 0, 255))
strip.rangeFill(300, 100, ws600.rgb(255, 255, 0))
strip.rangeFill(400, 100, ws600.rgb(255, 0, 255))
strip.rangeFill(500, 100, ws600.rgb(255, 255, 255))
strip.show()
```

## 開発・検証

2026-09-27の検証では、PXT micro:bit 9.1.1 / pxt-core 13.0.1でV1（mbdal）・V2（mbcodal）の
両方のHEX生成に成功しました。全17ブロックの逆コンパイルと日本語引数の検証、
ホスト上の11,410アサーションも通過しています。詳細は [VALIDATION.md](VALIDATION.md) を参照してください。
実機への書き込み・600個の物理LEDの点灯検証は未実施です。
テスト込みのV1ビルドはフラッシュ残量約13KBでした。利用するアプリごとの余裕を確認してください。

```sh
npm install
npm test
node tools/pxt.js install
node tools/pxt.js build --cloud
node tools/pxt.js test
node tools/check-blocks.js
```

`test.ts` はPXTのtestFilesにのみ登録され、利用者がインポートした際は含まれません。
このテストは輝度255を使うため **LEDを接続せずに実行** してください。
Nodeのホストテストは実際のライブラリとtest.tsをTypeScriptコンパイルして実行します。
範囲外Bufferアクセスを例外にするモック、送信回数・Buffer参照・割当回数の検査、
6色順のバイト検査、121通りの範囲、1000フレームの再利用、shift/rotateの独立した期待値比較を含みます。
モックテストはネイティブの電気的タイミングや実機RAMの保証にはなりません。
`tools/check-blocks.js` は全17種類のAPIをMakeCodeブロックXMLへ逆コンパイルし、
灰色のJavaScriptブロックに退避されていないことと日本語の引数名を検査します。
MakeCodeシミュレータ上での600個の描画や特殊色順の表示は検証対象外です。

実機では次を確認してください。

1. 消灯フレーム後、599番のみ緑。0～598番は消灯。
2. 先頭と末尾のRGBが正しい。100個ごとの境界がずれない。
3. ロジックアナライザで14,400bit、ビット周期、リセットLOW期間を確認。
4. 長時間の繰り返し送信で色化けやリセットがない。
5. 電源注入各点の電圧、配線・接続部の温度、実消費電流を確認。
6. 実際のアプリとの組合せでRAM余裕とradio/音声等の影響を確認。

## 公式実装の調査

調査日：2026-09-27。依存タグはGitHubのタグ一覧でも確認しました。

- [pxt-neopixel](https://github.com/microsoft/pxt-neopixel/blob/master/neopixel.ts)：Buffer保持、書き込み時の輝度適用、ブロック注釈を確認。
  本拡張はコードの丸ごと複製をせず、600個の境界操作と1本のBufferを中心に実装しています。
- [pxt-ws2812b v0.1.2](https://github.com/microsoft/pxt-ws2812b/tree/v0.1.2)：調査時点の最新タグ。
  `sendBuffer(Buffer, DigitalPin)` を使用。古いv0.1.1を理由なく固定せず、現行のv0.1.2を再現可能な依存先として選びました。
  リポジトリはアーカイブ済みです。
- [pxt-microbitのshim設定](https://github.com/microsoft/pxt-microbit/blob/master/pxtarget.json)：
  `sendBufferAsm` は `light::sendWS2812Buffer` へ接続されます。
- [現行ネイティブ送信](https://github.com/microsoft/pxt-microbit/blob/master/libs/core/light.cpp)：
  V2/CODALではnRF52用、V1では別のネイティブ処理を使用し、Buffer全体のポインタと長さを渡します。
  TypeScriptによる信号bit-bangingは実装していません。
- [Buffer API](https://github.com/microsoft/pxt-common-packages/blob/master/libs/base/buffer.ts)：
  インデックスアクセスを使用。巨大なnumber[]や色オブジェクト配列は作りません。

ライセンス：MIT。公式ドライバは依存パッケージとしてそのライセンスに従って利用します。

## Supported targets

* for PXT/microbit
