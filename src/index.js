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
import { createStorageAreaAsyncIterator } from './async_iterator.js';
import { promiseForRequest, promiseForTransaction, throwForDisallowedKey } from './idb_utils.js';

// TODOs/spec-noncompliances:
// - Susceptible to tampering of built-in prototypes and globals. We want to
//   work on tooling to ameliorate that.

// TODO: Use private fields when those ship.
// In the meantime we use this hard-to-understand, but effective, pattern:
// http://2ality.com/2016/01/private-data-classes.html#keeping-private-data-in-weakmaps
// Of note, the weak map entries will live only as long as the corresponding StorageArea instances.
//
// Cheatsheet:
// x.#y      <--->  _y.get(x)
// x.#y = z  <--->  _y.set(x, z)

const _databaseName = new WeakMap();
const _databasePromise = new WeakMap();

const DEFAULT_STORAGE_AREA_NAME = 'default';
const DEFAULT_IDB_STORE_NAME = 'store';

export class StorageArea {
  constructor (name) {
    const database = `kv-storage:${name}`;
    _databasePromise.set(this, null);
    _databaseName.set(this, database);
    // this._databasePromise = null;
    // this._databaseName = database;

    this.backingStore = {
      database,
      store: DEFAULT_IDB_STORE_NAME,
      version: 1
    };
  }

  async set (key, value) {
    throwForDisallowedKey(key);

    return performDatabaseOperation(this, 'readwrite', (transaction, store) => {
      if (value === undefined) {
        store.delete(key);
      } else {
        store.put(value, key);
      }

      return promiseForTransaction(transaction);
    });
  }

  async get (key) {
    throwForDisallowedKey(key);

    return performDatabaseOperation(this, 'readonly', (transaction, store) => {
      return promiseForRequest(store.get(key));
    });
  }

  async delete (key) {
    throwForDisallowedKey(key);

    return performDatabaseOperation(this, 'readwrite', (transaction, store) => {
      store.delete(key);
      return promiseForTransaction(transaction);
    });
  }

  async clear () {
    // const databasePromise = this._databasePromise
    const databasePromise = _databasePromise.get(this);
    if (databasePromise !== null) {
      // Don't try to delete, and clear the promise, while we're opening the database; wait for that
      // first.
      try {
        await databasePromise;
      } catch (e) {
        // If the database failed to initialize, then that's fine, we'll still try to delete it.
      }

      // this._databasePromise = null;
      _databasePromise.set(this, null);
    }

    // return promiseForRequest(self.indexedDB.deleteDatabase(this._databaseName));
    return promiseForRequest(self.indexedDB.deleteDatabase(_databaseName.get(this)));
  }

  keys () {
    return createStorageAreaAsyncIterator(
      'keys', steps => performDatabaseOperation(this, 'readonly', steps));
  }

  values () {
    return createStorageAreaAsyncIterator(
      'values', steps => performDatabaseOperation(this, 'readonly', steps));
  }

  entries () {
    return createStorageAreaAsyncIterator(
      'entries', steps => performDatabaseOperation(this, 'readonly', steps));
  }
}

if (typeof Symbol === 'function' && Symbol.asyncIterator) {
  StorageArea.prototype[Symbol.asyncIterator] = StorageArea.prototype.entries;
}

export const storage = new StorageArea(DEFAULT_STORAGE_AREA_NAME);

async function performDatabaseOperation (area, mode, steps) {
  // if (this._databasePromise === null) {
  if (_databasePromise.get(area) === null) {
    initializeDatabasePromise(area);
  }

  // const database = await this._databasePromise;
  const database = await _databasePromise.get(area);
  const transaction = database.transaction(DEFAULT_IDB_STORE_NAME, mode);
  const store = transaction.objectStore(DEFAULT_IDB_STORE_NAME);

  return steps(transaction, store);
}

function initializeDatabasePromise (area) {
  const databaseName = _databaseName.get(area);
  // const databaseName = this._databaseName;

  // this._databasePromise = (
  _databasePromise.set(area,
    new Promise((resolve, reject) => {
      const request = self.indexedDB.open(databaseName, 1);

      request.onsuccess = () => {
        const database = request.result;

        if (!checkDatabaseSchema(database, databaseName, reject)) {
          return;
        }

        database.onclose = () => {
          _databasePromise.set(area, null);
        };
        database.onversionchange = () => {
          database.close();
          _databasePromise.set(area, null);
        };
        resolve(database);
      };

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = () => {
        try {
          request.result.createObjectStore(DEFAULT_IDB_STORE_NAME);
        } catch (e) {
          reject(e);
        }
      };
    }));
}

function corrupted (databaseName) {
  return new Error(`kv-storage: database "${databaseName}" corrupted`);
}

function checkDatabaseSchema (database, databaseName, reject) {
  if (database.objectStoreNames.length !== 1) {
    reject(corrupted(databaseName));
    return false;
  }

  if (database.objectStoreNames[0] !== DEFAULT_IDB_STORE_NAME) {
    reject(corrupted(databaseName));
    return false;
  }

  const transaction = database.transaction(DEFAULT_IDB_STORE_NAME, 'readonly');
  const store = transaction.objectStore(DEFAULT_IDB_STORE_NAME);

  if (store.autoIncrement || store.keyPath || store.indexNames.length) {
    reject(corrupted(databaseName));
    return false;
  }

  return true;
}
