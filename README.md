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

## Available Module Formats


**ES Modules:** _(for everything)_

```js
import storage from 'kv-storage-polyfill';  // default storage namespace
import { StorageArea } from 'kv-storage-polyfill';  // instantiable StorageArea class
import storage, { StorageArea } from 'kv-storage-polyfill';  // you can combine
```

**CommonJS:** _(for Node/browserify)_

```js
const storage = require('kv-storage-polyfill');  // default storage namespace
const storage = require('kv-storage-polyfill').default  // also works, just an alias
const { StorageArea } = require('kv-storage-polyfill');  // instantiable StorageArea class
```

**UMD/AMD:** _(for compatibility)_

```js
define(['/web/kv-storage-polyfill.umd.js'], function(storage) {
  storage === storage.default // default storage area
  storage.StorageArea  // instantiable StorageArea class
});
```

**Browser Globals:** _(for demos)_

```html
<script src="/web/kv-storage-polyfill.umd.js"></script>
<script>
  const { StorageArea } = kvStoragePolyfill;
  const storage = kvStoragePolyfill;  // optional `.default` if you want
</script>
```


## License

Apache 2

[Import Map]: https://github.com/WICG/import-maps
