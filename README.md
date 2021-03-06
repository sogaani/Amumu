# Amumu
**[Chinachu](https://chinachu.moe/)** と連携してエンコードの管理を行います。

[![GitHub issues](https://img.shields.io/github/issues/sogaani/Amumu.svg?style=flat-square)](https://github.com/sogaani/Amumu/issues)
[![Code Climate](https://img.shields.io/codeclimate/github/sogaani/Amumu.svg?style=flat-square)](https://codeclimate.com/github/sogaani/Amumu)
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/sogaani/Amumu/blob/master/LICENSE)

## DEMO
|![](https://raw.github.com/wiki/sogaani/Amumu/images/demo1.jpg)|![](https://raw.github.com/wiki/sogaani/Amumu/images/demo2.jpg)|
|---|---|

## Contributing
質問やバグ報告は [issue](https://github.com/sogaani/Amumu/issues) または [twitter](https://twitter.com/sogaani2) へ

## Features
AmumuはChinachuにエンコードしたファイルの管理機能を追加するProxyServerと、エンコードを実行するEncoderで構成されます。
ProxyServerとEncoderでエンコードの結果を共有するためにMongooDBを利用します。

* RecordedCommandやweb uiからのエンコード指示
* エンコードしながらの再生
* エンコードしたファイルのダウンロードと再生
* ハードウェアエンコード

## Requirements
### ProxyServer
* [Node.js](http://nodejs.org/) `8.1.x~`
* mongodb
* ffmpeg `3.3~`

### Encoder
* [Node.js](http://nodejs.org/) `8.1.x~`
* mongodb
* ffmpeg `3.3~`

## Install

### Download
```
git clone https://github.com/sogaani/Amumu.git
```

### MongoDB(Linux)
Cloneしたディレクトリで下記のコマンドを実行してください。
* MongoDB
```
./amumu installer
#mongodb: localディレクトリにmongodbをインストールします。
```
* 実行
```
./amumu setup db #mongoをport10782で起動
```

### Client
```
cd path/to/Chinachu
vim config.json
```
* "recordedCommand"にAmumu直下にあるrecordedCommandのパスを設定してください。

[Setup](#setup)以外の方法でMongoDBを起動する場合はMongoDBのアドレスを設定してください。
```
cp client_config.sample.json client_config.json
vim client_config.json
```
* "mongodbPath"に起動しているMongoDBのアドレスを設定してください。

### ProxyServer(Linux)
Cloneしたディレクトリで下記のコマンドを実行してください。
* Nodejs
```
./amumu installer
#Node.js Environment and Modules: localディレクトリにnodeをインストールします。
```
> **Note**: *Auto* や *mongodb* でインストールされるmongodbは64bitLinux用です。ARMの場合は[こちら](https://github.com/Barryrowe/mongo-arm)からインストールしてください。

* ffmpeg
    * [Linux Packages or Linux Static Builds](https://ffmpeg.org/download.html)

* 実行
```
./amumu setup db #mongoをport10782で起動
./amumu service proxy execute #ProxyServerの起動
./amumu service proxy initscript > amumu-proxy #initスクリプトの生成
```

### ProxyServer(Windows)
* Nodejs
    * [Windows Installer](https://nodejs.org/en/download/current/)
    ```
    npm install
    ```

* ffmpeg
    * [Windows Packages](https://ffmpeg.org/download.html)
    * ffmpegがあるフォルダを環境変数PATHに追加してください。

* 実行
```
npm run proxy
```

### Configuration
```
cp proxy/proxy_config.sample.json proxy_config.json
vim proxy_config.json
```

* proxy_config.json

name      |Type       |Default|Required  |Description
---------------|-----------|------------|------|-----
amumuPath      |string| | yes |
mongodbPath    |string    |            | yes |
encoders    |array    |            | yes | amumu encoderを起動しているホストのipアドレス
recording      |[directory](#directory_obj)    |            | yes | chinachuで録画中のファイルが置かれるフォルダ
encoded         |[directory](#directory_obj)    |            | yes | エンコード済みのファイルが置かれているパス
port    |number    |           | yes  | ProxyServerのポート

### EncodeServer(Linux)
* Nodejs
    ```
    git clone https://github.com/sogaani/Amumu.git
    cd Amumu
    ./amumu installer
    #Node.js Environment and Modules: localディレクトリにnodeをインストールします。
    ```
    > **Note**: Proxyと同じPCで動作させる場合はこのステップを飛ばしてください。

* ffmpeg
    * [Linux Packages or Linux Static Builds](https://ffmpeg.org/download.html)

* 実行
```
./amumu setup db #mongoをport10782で起動
./amumu service encoder execute #encoderの起動
./amumu service encoder initscript > amumu-encoder #initスクリプトの生成
```

### EncodeServer(Windows)
* Nodejs
    * [Windows Installer](https://nodejs.org/en/download/current/)
    ```
    npm install
    ```
* ffmpeg
    * [Windows Packages](https://ffmpeg.org/download.html)
    * ffmpegがあるフォルダを環境変数PATHに追加してください。

* 実行
```
npm run encoder
```

### Configuration
```
cp encoder/encoder_config.sample.json encoder_config.json
vim encoder_config.json
```

* encoder_config.json

name      |Type       |Default|Required  |Description
---------------|-----------|------------|------|-----
chinachuPath      |string| | yes | AmumuのProxyServerを立てていればProxyServerへのパスを設定
mongodbPath    |string    |            | yes |
encoder        |[encoder](#encoder_obj)   |            | yes | エンコードの設定
encoded         |[directory](#directory_obj)    |            | yes | エンコード済みのファイルを置くフォルダ
deleteEncodedFile|boolean        | false | no  | エンコード後にm2tsを削除
limit    |number    | 1          | no  | 同時にエンコードできる数


<a name="directory_obj"></a>
* directory

エンコードしたファイルを置くフォルダを設定します。

name      |Type       |Default|Required  |Description
---------------|-----------|------------|------|-----
type           |string    | file        | no  | フォルダへのアクセス方法 smb(windows only),file
path           |string    |             | yes | フォルダへのフルパス
authUser       |string    |             | no  | smbのユーザ(windows only)
authPass       |string    |             | no  | smbのパスワード(windows only)


<a name="encoder_obj"></a>
* encoder

エンコードのオプションが設定できます。

name      |Type       |Default|Required  |Description
---------------|-----------|------------|------|-----
format         |string    | mp4        | no  | エンコードしたファイルのフォーマット 現状はmp4のみ
hardware       |string    |            | no  | ハードウェアエンコード qsv,vaapi,nvenc
quality        |string    |            | yes | エンコードの画質　high,medium,low
size           |number    | asis       | no  | エンコード後の動画サイズ。高さで指定
deinterlace    |boolean   | false      | no  | エンコード時にデインタレース

## License
[The MIT License](https://github.com/sogaani/Amumu/blob/master/LICENSE) (c) [@sogaani](https://github.com/sogaani)
