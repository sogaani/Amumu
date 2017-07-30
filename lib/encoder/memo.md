# qualityを変えた時のエンコード結果
値は動画の内容や環境によって変わるので、相対比較として見てください。

### qsv
* high
    * size= 41.7 MB
    * fps= 121
* medium
    * size= 24.8 MB
    * fps= 122
* low
    * size= 15.2 MB
    * fps= 121

### evenc
* high
    * size= 56.8 MB
    * fps= 381
* medium
    * size= 35.4 MB
    * fps= 369
* low
    * size= 21.9 MB
    * fps= 377

### cpu
* high
    * size= 28.5 MB
    * fps= 99
* medium
    * size= 16.5 MB
    * fps= 105
* low
    * size= 8.76 MB
    * fps= 112

## 共通の設定
* resize: "720"
* deinterlace: true

## Hardware
* Intel(R) Core(TM) i5-6500 CPU @ 3.20GHz
* NVIDIA GeForce GTX 960
