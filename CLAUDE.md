# ボタン図鑑 — 作業メモ（引き継ぎ書）

むらさきさんの手もちのヴィンテージボタンを、写真から3Dにして見せる図鑑サイト。
GitHub Pages で公開: https://murasakiutau-create.github.io/Button_zukan/

## 大事な約束

- **撮ったままの写真・動画はリポジトリに入れない。** 入れてよいのは、写真からボタン部分を切り抜いて加工した表面画像（front.jpg など）だけ。元写真は作業用ディレクトリに置き、コミットしない（`.gitignore` 参照）。
- やり取りは日本語で、とてもやさしく。むらさきさんは実物を見て「ここが違う」と伝えてくれる。直すのはこちらの役目。
- CSS で `!important` は使わない。
- 画面演出でチカチカする点滅は避ける（ラメは角度で光るだけ、勝手に点滅させない）。
- 1ボタンにつき「見どころ」を1〜2個決めて、そこを重点的に再現する（本物そっくりを目指して終わらなくならないように）。

## 構成

```
index.html               一覧（tools/build_pages.py が生成）
buttons/NNN/index.html   個別ページ（生成）
buttons/NNN/model.js     そのボタンの3D（形・材質）。手で書く
buttons/NNN/*.jpg|png    表面画像・マスク。thumb.png は一覧とOGP用
assets/zukan.js          共通の3Dコード（three.js r147, classic script）
assets/zukan.css         共通スタイル
data/buttons.json        名前・説明文（SEO用の description もここ）
tools/build_pages.py     HTML / sitemap.xml / robots.txt を生成
```

ページの文言を変えたら `python3 tools/build_pages.py` を実行してからコミット。

## ボタンの作り方（これまでのやり方）

1. 表・裏・横の写真をもらう。透けるボタンは手で持った写真や動画も参考にする。
2. 写真からボタン部分を切り抜き、1024×1024 の表面画像にする（円形は HoughCircles、変形は輪郭を手でなぞる or 花形などは関数でフィット）。指や白飛びは inpaint で補う。
3. 裏の写真は左右反転して表の輪郭に合わせると、model.js で普通の UV のまま貼れる（No.005, 006）。
4. 見どころ用のマップを作る：
   - 模様の流れ（構造テンソルで向き）→ `sheen.png`（R=cos2θ, G=sin2θ, B=強さ）… 貝・シャトヤンシーの光の筋
   - ラメのある場所 → `glitter.png`
5. model.js で形を組む（`cap` / `rim` / `cloverRelief`（高さマップ）/ `stripRot` / ExtrudeGeometry）。材質は zukan.js の `marbleMat` `glowMat` `pearlMat` `glitterMat` `bowMat` などを使い回す。
6. 裏の足はたいてい「溝＋真ん中の小さな橋（下に糸のトンネル）」。盛り上がった棒ではない。
7. data/buttons.json に追記 → build_pages.py → サムネイル（`?thumb` を付けて開き canvas.toDataURL、512px）を作る。

## 座標のきまり

- ボタンの外接半径を 1 とする。表が +z、裏が -z。
- 写真の UV は `x/2+.5, y/2+.5`。裏で `mirrorU=true` のときは x を反転（No.001〜004）。
- `viewer()` は `build.env = 'jewel'` で金属向けのくっきりした映り込みに切り替わる。
