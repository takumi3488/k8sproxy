# k8sproxy

以下の2つの機能を合わせたものです。

- リクエストのパスの最初の部分を元に別のURLにプロキシする
- 環境変数に設定したパスワードによる認証

例えば、`/a/index.html` を `http://a-svc.example.com/index.html` にプロキシできます。

## 環境変数

PASSWORD: BASE64エンコーディングしたパスワード
URL_MAP: {"パス":"URL"} 形式のJSON
REDIS_URL: redisのURL

例

```
PASSWORD=ZXhhbXBsZQ==
URL_MAP='{"example":"http://exmaple.com"}'
REDIS_URL="redis://redis:6379"
```
