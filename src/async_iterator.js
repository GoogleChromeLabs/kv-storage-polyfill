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

import WeakMap from './weak_map.js';
import { getNextKey, getNextKeyValuePair, HASNT_STARTED_YET } from './idb_utils.js';

const _performDatabaseOperation = new WeakMap();
const _lastKey = new WeakMap(); // undefined = got to the end;
// HASNT_STARTED_YET = not yet started
const _ongoingPromise = new WeakMap();
const _mode = new WeakMap();

// @TODO this could be a function and we could use scope instead of weakmaps/properties
class StorageAreaAsyncIterator {
  return () {
    _lastKey.set(this, undefined);
    // _performDatabaseOperation.set(iter, undefined);
    // _ongoingPromise.set(iter, undefined);
  }

  next () {
    const performDatabaseOperation = _performDatabaseOperation.get(this);
    if (!performDatabaseOperation) {
      return Promise.reject(new TypeError('Invalid this value'));
    }

    // We need to avoid multiple concurrent calls into the main logic of next(),
    // which can happen if you manually manipulate the async iterator, i.e.
    // `iter.next(); iter.next()` with no `await`s. This is because until we
    // actually have the last key set correctly, such concurrent calls will use
    // the wrong value for lastKey.

    const currentOngoingPromise = _ongoingPromise.get(this);
    let thisNextPromise;
    if (currentOngoingPromise !== undefined) {
      thisNextPromise = currentOngoingPromise.then(
        () => getNextIterResult(this, performDatabaseOperation));
    } else {
      thisNextPromise = getNextIterResult(this, performDatabaseOperation);
    }

    _ongoingPromise.set(this, thisNextPromise);
    return thisNextPromise;
  }
}

if (typeof Symbol === 'function' && Symbol.asyncIterator) {
  StorageAreaAsyncIterator.prototype[Symbol.asyncIterator] = function () {
    return this;
  };
}

function getNextIterResult (iter, performDatabaseOperation) {
  return performDatabaseOperation(async (transaction, store) => {
    const lastKey = _lastKey.get(iter);
    if (lastKey === undefined) {
      return { value: undefined, done: true };
    }

    const mode = _mode.get(iter);
    let key;
    let value;
    let iterResultValue;
    switch (mode) {
    case 'keys': {
      key = await getNextKey(store, lastKey);
      iterResultValue = key;
      break;
    }
    case 'values': {
      [key, value] = await getNextKeyValuePair(store, lastKey);
      iterResultValue = value;
      break;
    }
    case 'entries': {
      [key, value] = await getNextKeyValuePair(store, lastKey);
      iterResultValue = key === undefined ? undefined : [key, value];
      break;
    }
    }

    _lastKey.set(iter, key);
    _ongoingPromise.set(iter, undefined);

    return { value: iterResultValue, done: key === undefined };
  });
}

export function createStorageAreaAsyncIterator (mode, performDatabaseOperation) {
  const iter = new StorageAreaAsyncIterator();
  _mode.set(iter, mode);
  _performDatabaseOperation.set(iter, performDatabaseOperation);
  _lastKey.set(iter, HASNT_STARTED_YET);
  _ongoingPromise.set(iter, undefined);
  return iter;
}
