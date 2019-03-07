/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export function promiseForRequest (request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export function keyValuePairPromise (store, range) {
  const keyRequest = store.getKey(range);
  const valueRequest = store.get(range);

  return new Promise((resolve, reject) => {
    keyRequest.onerror = () => {
      reject(keyRequest.error);
    };
    valueRequest.onerror = () => {
      reject(valueRequest.error);
    };
    valueRequest.onsuccess = () => {
      resolve([keyRequest.result, valueRequest.result]);
    };
  });
}

export function promiseForTransaction (transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(transaction.error);
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

export function throwForDisallowedKey (key) {
  if (!isAllowedAsAKey(key)) {
    throw Error('kv-storage: The given value is not allowed as a key');
  }
}

export const HASNT_STARTED_YET = {};

export function getNextKey (store, lastKey) {
  const range = getRangeForKey(lastKey);
  return promiseForRequest(store.getKey(range));
}

export function getNextKeyValuePair (store, lastKey) {
  const range = getRangeForKey(lastKey);
  return keyValuePairPromise(store, range);
}

function getRangeForKey (key) {
  if (key === HASNT_STARTED_YET) {
    // This is a stand-in for the spec's "unbounded" range, which isn't exposed
    // to JS currently. If we ever get keys that sort below -Infinity, e.g. per
    // https://github.com/w3c/IndexedDB/issues/76, then this needs to change.
    // Alternately, if we add better primitives to IDB for getting the first
    // key, per
    // https://github.com/WICG/kv-storage/issues/6#issuecomment-452054944, then
    // we could use those.
    return IDBKeyRange.lowerBound(-Infinity);
  }
  return IDBKeyRange.lowerBound(key, true);
}

function isAllowedAsAKey (value) {
  if (typeof value === 'number' || typeof value === 'string') {
    return true;
  }

  if (typeof value === 'object' && value) {
    if (Array.isArray(value)) {
      return true;
    }

    if ('setUTCFullYear' in value) {
      return true;
    }

    if (typeof ArrayBuffer === 'function' && ArrayBuffer.isView(value)) {
      return true;
    }

    // isArrayBuffer
    if ('byteLength' in value && 'length' in value) {
      return true;
    }
  }

  return false;
}
