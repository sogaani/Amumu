# Amumu
**[Chinachu](https://chinachu.moe/)** と連携してエンコードの管理を行います。

## Features
* RecordedCommandによるエンコードのキューイング
* エンコードの並列数制御
* 分散エンコード（試してない）

## Requirements / Supported Platforms
#### client
* [Node.js](http://nodejs.org/) `6.5.x~`
* Linux

#### server
* [Node.js](http://nodejs.org/) `8.1.x~`
* ffmpeg `3.3~`
* Windows/Linux

## Usage

### Client
Chinachuが動作しているPCで利用してください。

#### Install
```
git clone https://github.com/sogaani/Amumu.git
cd Amumu
./amumu installer
#Auto (full): localディレクトリにmongodbとnodeをインストールします。
#Node.js Environment and Modules: localディレクトリにnodeをインストールします。
#mongodb: localディレクトリにmongodbをインストールします。
```
**Note**: *Auto* や *amumu_installer_mongodb* でインストールされるmongodbは64bitLinux用です。ARMの場合は[こちら](https://github.com/Barryrowe/mongo-arm)からインストールしてください。

#### Setup
```
#mongoをport10782で起動
./amumu setup db
```

#### Configuration
```
cd path/to/Chinachu
vim config.json
```
* "recordedCommand"にAmumu直下にあるrecordedCommandのパスを設定してください。

[Setup](#Setup)以外の方法でMongoDBを起動する場合はMongoDBのアドレスを設定してください。
```
cp client_config.sample.json client_config.json
vim client_config.json
```
* "mongodbPath"に起動しているMongoDBのアドレスを設定してください。

### Server

#### Install
##### Linux
* Nodejs
    ```
    git clone https://github.com/sogaani/Amumu.git
    cd Amumu
    ./amumu installer
    #Node.js Environment and Modules: localディレクトリにnodeをインストールします。
    ```
    **Note**: Clientと同じPCで動作させる場合はこのステップを飛ばしてください。

* ffmpeg
    * [Linux Packages or Linux Static Builds](https://ffmpeg.org/download.html)

##### Windows
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
cp server_config.sample.json server_config.json
vim server_config.json
```

* server_config.json

プロパティ      |種類       |デフォルト値|必須  |説明
---------------|-----------|------------|------|-----
mongodbPath    |string    |            | yes |
chinachuPath   |string    |            | no  | deleteEncodedFile replaceRecordedToEncoded を利用する場合に必要
encoder        |object    |            | yes | エンコードの設定
input          |object    |            | yes | 入力ファイル
output         |object    |            | yes | 出力ファイル
deleteEncodedFile|boolean        | false | no  | エンコード後にm2tsを削除
replaceRecordedWithEncoded|boolean | false | no  | エンコード後にChinachuがmp4を再生するようにする。([改造したChinachu](https://github.com/sogaani/Chinachu)を使っている必要があります。)
workerLimit    |number    | 1          | no  | 同時にエンコードできる数

* input/output

プロパティ      |種類       |デフォルト値|必須  |説明
---------------|-----------|------------|------|-----
type           |string    | file        | no  | ファイルへのアクセス方法 smb(windows only),file
path           |string    |             | yes | ファイルへのフルパス パス中の\<id\>はエンコードするファイルのid \<file\>はエンコードする拡張子なしファイル名で置き換えられます。
authUser       |string    |             | no  | smbのユーザ(windows only)
authPass       |string    |             | no  | smbのパスワード(windows only)

* encoder

エンコードのオプションが設定できます。
プロパティ      |種類       |デフォルト値|必須  |説明
---------------|-----------|------------|------|-----
hardware       |string    |            | no  | ハードウェアエンコード qsv,vaapi,nvenc
quality        |string    |            | yes | エンコードの画質　high,medium,low
size           |number    | asis       | no  | エンコード後の動画サイズ。高さで指定
deinterlace    |boolean   | false      | no  | エンコード時にデインタレース

自分で設定を詰めたい場合は引数やエンコーダを自由に指定できます。
プロパティ      |種類       |デフォルト値|必須  |説明
---------------|-----------|------------|------|-----
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