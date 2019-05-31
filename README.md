# kv-storage polyfill

A polyfill for the [kv-storage built-in module](https://github.com/WICG/kv-storage).

## Usage

First, ensure you have an [Import Map] defined to enable the browser version where supported:

```html
<script type="importmap">
{
  "imports": {
    "/node_modules/kv-storage-polyfill/dist/kv-storage-polyfill.mjs": [
      "std:kv-storage",
      "/node_modules/kv-storage-polyfill/dist/kv-storage-polyfill.mjs"
    ]
  }
}
</script>
```

Then import the polyfill. If the browser supports `std:kv-storage` natively, it will use that instead:

```js
import { storage } from '/node_modules/kv-storage-polyfill/dist/kv-storage-polyfill.mjs';

(async () => {
  await storage.set("mycat", "Tom");
  console.assert(await storage.get("mycat") === "Tom");

  console.log(await storage.entries());
  // Logs [["mycat", "Tom"]]

  await storage.delete("mycat");
  console.assert(await storage.get("mycat") === undefined);
})();
```

## License

Apache 2

[Import Map]: https://github.com/WICG/import-maps
