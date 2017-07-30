# Amumu
**[Chinachu](https://chinachu.moe/)** と連携してエンコードの管理を行います。

[![GitHub issues](https://img.shields.io/github/issues/sogaani/Amumu.svg?style=flat-square)](https://github.com/sogaani/Amumu/issues)
[![Code Climate](https://img.shields.io/codeclimate/github/sogaani/Amumu.svg?style=flat-square)](https://codeclimate.com/github/sogaani/Amumu)
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/sogaani/Amumu/blob/master/LICENSE)

## Features
* RecordedCommandやweb uiからのエンコード指示
* エンコードしたファイルのダウンロードと再生
* ハードウェアエンコード

## Requirements / Supported Platforms
* [Node.js](http://nodejs.org/) `8.1.x~`
* ffmpeg `3.3~`
* Windows/Linux

## Usage

### Install
```
git clone https://github.com/sogaani/Amumu.git
cd Amumu
./amumu installer
#Auto (full): localディレクトリにmongodbとnodeをインストールします。
#Node.js Environment and Modules: localディレクトリにnodeをインストールします。
#mongodb: localディレクトリにmongodbをインストールします。
```
> **Note**: *Auto* や *mongodb* でインストールされるmongodbは64bitLinux用です。ARMの場合は[こちら](https://github.com/Barryrowe/mongo-arm)からインストールしてください。

### Setup
```
#mongoをport10782で起動
./amumu setup db
```

### ProxyServer

#### Configuration
```
cp server/server_config.sample.json server_config.json
vim server_config.json
```

* server_config.json

name      |Type       |Default|Required  |Description
---------------|-----------|------------|------|-----
amumuPath      |string| | yes |
mongodbPath    |string    |            | yes |
encoded         |[encoded](#encoded_obj)    |            | yes | エンコード済みのファイルが置かれているパス
port    |number    |           | yes  | ProxyServerのポート

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

### EncodeServer

#### Linux
* Nodejs
    ```
    git clone https://github.com/sogaani/Amumu.git
    cd Amumu
    ./amumu installer
    #Node.js Environment and Modules: localディレクトリにnodeをインストールします。
    ```
    > **Note**: Clientと同じPCで動作させる場合はこのステップを飛ばしてください。

* ffmpeg
    * [Linux Packages or Linux Static Builds](https://ffmpeg.org/download.html)

#### Windows
* Nodejs
    * [Windows Installer](https://nodejs.org/en/download/current/)
    ```
    npm install
    ```
* ffmpeg
    * [Windows Packages](https://ffmpeg.org/download.html)
    * ffmpegがあるフォルダを環境変数PATHに追加してください。

#### Configuration
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
encoded         |[encoded](#encoded_obj)    |            | yes | エンコード済みのファイルを置くフォルダ
deleteEncodedFile|boolean        | false | no  | エンコード後にm2tsを削除
limit    |number    | 1          | no  | 同時にエンコードできる数


<a name="encoded_obj"></a>
* encoded


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
format         |string    | mp4        | no | エンコードしたファイルのフォーマット 現状はmp4のみ
hardware       |string    |            | no  | ハードウェアエンコード qsv,vaapi,nvenc
quality        |string    |            | yes | エンコードの画質　high,medium,low
size           |number    | asis       | no  | エンコード後の動画サイズ。高さで指定
deinterlace    |boolean   | false      | no  | エンコード時にデインタレース

自分で設定を詰めたい場合は引数やエンコーダを自由に指定できます。

プロパティ      |種類       |デフォルト値|必須  |説明
---------------|-----------|------------|------|-----
format         | string    |           | yes | エンコード後のファイルのフォーマット　拡張子として使われます。
process        |string    |            | yes | エンコーダーコマンド
args           |array     |            | yes | 引数 \<input\>と\<output\>はエンコード時にserver_config.jsonのinputやoutputのpathで置き換えられます。

#### Execution
##### Linux
```
./amumu server
```

##### Windows
```
npm run server
```

## License
[The MIT License](https://github.com/sogaani/Amumu/blob/master/LICENSE) (c) [@sogaani](https://github.com/sogaani)
