# 仕様書

アプリの「何を・どう動かすか」を書く。AIは作業の前に必ずここを読む。

## 目的

スマホの縦画面を親指1タップで遊ぶ、積み上げ系の30秒〜1分のバズるWebゲーム。結果は称号つきのスクショ映えする画面で共有できる。（元のメモ：スマホで流れてきて思わず遊んでシェアしたくなる、バズる Web ゲーム（ジャンルはおまかせ））

## 前提

- 使う人・使う場面（デザイン担当の分析。推定を含む）：
  - 使う人：X・Instagram・TikTok でリンクや結果のスクショが流れてきて、思わずタップした人。説明は読まない
  - 使う場面：電車や休み時間に、スマホを縦に持って親指1本で30秒〜1分。負けたらすぐ「もう一回」
  - 遊んだあと：称号つきの結果の画面をスクショするか「結果をシェア」で友だちに送り、相手も同じURLで挑む
  - PC では、スペースキーかクリックで同じ遊び方ができる
- 技術：TypeScript・Vite（Canvas／WebGL）、テストはVitest。Vercel で公開する（スマホ・PC のブラウザで遊ぶ）

## 画面

（ページごとに、何を出して何ができるか）

### SNS のカード画像（og:image）

- URL が SNS（X・Instagram など）に貼られたときに出る、1200×630 の静的な画像 1 枚。`public/og.png` に置き、`dist/og.png` として配信する。結果ごとには変えない
- `/?scene=og` で、同じ絵を 1200×630 の canvas に開ける（撮影用。`.github/scripts/shot.mjs` で撮って `public/og.png` に置く。ビルドでは作らない）
- `index.html` の meta：`og:image`・`og:image:width`（1200）・`og:image:height`（630）・`og:image:alt`・`og:url`・`og:type`、`twitter:card`（`summary_large_image`）、`twitter:image`。画像と URL は絶対URL（本番の公開アドレス。`index.html` の1か所にまとめる）
- 見た目は `docs/design.md` の「SNS のカード画像」

## あとで（今は入れない）

-
