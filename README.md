# k8sproxy

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
