# 検証記録

日付：2026-09-27。ホストはWindows。実機は未接続。

## ツールと依存

- TypeScript 4.8.3（ホストのstrict型検査）
- pxt-microbit 9.1.1 / pxt-core 13.0.1 / pxt-common-packages 14.0.2
- pxt-ws2812b v0.1.2、タグのコミット `967493acf2804ddd2f2ce8e3819548e923c6397f`
- 公式の現行ソースと送信shimを調査したうえで実装。参照リンクはREADME末尾。

## 実行結果

| 検査 | 結果 |
| --- | --- |
| strict TypeScript型検査 | 成功 |
| test.tsのホスト実行 | 11,410アサーション成功 |
| LED0のみ赤、LED599のみ緑、両端同時設定 | 成功 |
| fill / clear / fillRGB / setRangeRGB | 成功 |
| rangeFill(0,600)、(599,1)、(590,50) | 成功 |
| 負index、600以上、巨大値、NaN、無限大 | 範囲外読み書きなし |
| 121通りのstart/length | 独立した期待値と一致 |
| brightness 0 / 255 / 64 | 成功。既存Bufferに遡及しない仕様も確認 |
| 6種類の色順 | 生バイト列を直接検査して成功 |
| 600個のBuffer | 1800バイト |
| 1000フレーム | ピクセルBufferの追加割当0回、送信1000回、毎回同一1800バイトBuffer |
| shift / rotate | 正負・端・全長以上の独立した配列モデルと一致 |
| PXT install | v0.1.2の解決に成功 |
| PXT build --cloud | V1/V2とUniversal HEX生成に成功 |
| PXT test | test.tsを含むネイティブコンパイル成功（実機実行ではない） |
| 全17カスタムブロック | PXTによるXML逆コンパイル成功、灰色JSブロック0 |
| 日本語ローカライズ | APIと引数プレースホルダーが一致 |
| 公開GitHubタグからの導入 | 新規PXTプロジェクトがv1.0.0を取得し、V1/V2とUniversal HEX生成に成功 |

公開後の導入確認では `github:gankun2008-creator/pxt-ws600#v1.0.0` を依存先に指定し、
下記の「599番だけ緑」のコードをコンパイルしました。取得されたコミットは
`d9c6c94c25f2d247d7cc48d9fc130fb7a90189ca` です。ローカルのライブラリファイルへの参照は使っていません。

PXTのtestコマンドは `--cloud` フラグを受け付けなかったため、正式な引数なしの
`node tools/pxt.js test` に修正して成功しました。

## 最重要の回帰テスト

```typescript
let strip = ws600.create(DigitalPin.P0, 600)
strip.clear()
strip.show()
strip.setPixelRGB(599, 0, 255, 0)
strip.show()
```

- 初期輝度は64。
- Bufferバイト0～1796は **すべて0**。変更前後とshow後をホストで確認。
- Bufferバイト1797～1799は **[64, 0, 0]**（GRB）。
- 色設定は送信を行わず、2回のshowで全体をそれぞれ1回送信。
- したがってLED0～598は黒、599だけ緑を指定するデータとなる。
- 実際の発光結果は配線・色順・LEDの状態・電源の実機確認が必要。

## ネイティブ生成物

test.ts構成のPXTアセンブリヘッダーより（ブロック検証用の追加コードを含まない値）：

| ターゲット | コード合計 | コンパイラが報告した残りフラッシュ |
| --- | ---: | ---: |
| V1 / mbdal | 229,624 bytes | 13,064 bytes |
| V2 / mbcodal | 304,376 bytes | 166,664 bytes |

これらはランタイムとテストを含む **フラッシュ** の値で、RAMの実測値ではありません。
LED Bufferは1800バイト、ほかにStripオブジェクト、Bufferヘッダー、スタック、ランタイムのRAMが必要です。
動的な最大RAMや実機の空きRAMは未測定です。

## 未完了の環境依存項目

- 公開先：[gankun2008-creator/pxt-ws600](https://github.com/gankun2008-creator/pxt-ws600)。
  MakeCodeブラウザ画面でのインポート操作は未検証です。
- V1/V2の実機書き込み、600LEDでの点灯、電源負荷、波形、長時間試験。
- Bluetooth同時動作は対応範囲外。radio/音声等を併用するアプリは個別検証が必要。

READMEの手順で同じテストを再実行できます。生成HEXはtest.ts用の高輝度テストを含むため、
LEDを接続した状態に不用意に書き込まないでください。通常利用では拡張をインポートしたプロジェクトを作成します。
