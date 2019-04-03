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

import { StorageArea, storage } from '..';

async function collectAsyncIterator (asyncIterator) {
  const array = [];
  for await (const entry of asyncIterator) {
    array.push(entry);
  }
  return array;
}

let counter = 0;

console.log({ StorageArea, storage });

describe('StorageArea', () => {
  let area;
  afterEach(async () => {
    if (area) {
      await area.clear();
      area = null;
    }
  });

  it('should be a class', () => {
    expect(typeof StorageArea).toBe('function');
  });

  describe('StorageArea#set', () => {
    it('should allow setting a value', async () => {
      area = new StorageArea(++counter);

      const result = await area.set('foo', 'bar');
      expect(result).not.toBeDefined();

      const got = await area.get('foo');
      expect(got).toBe('bar');
    });
  });

  describe('StorageArea#entries', () => {
    it('should be a thing', async () => {
      area = new StorageArea(++counter);

      await area.set('mycat', 'Tom');
      await area.set('mydog', 'Jerry');

      const entries = await collectAsyncIterator(area.entries());
      console.log(entries);
      expect(entries).toEqual([
        ['mycat', 'Tom'],
        ['mydog', 'Jerry']
      ]);
    });
  });

  describe('StorageArea#delete', () => {
    it('should be a thing', async () => {
      area = new StorageArea(++counter);

      await area.set('mycat', 'Tom');
      expect(await area.get('mycat')).toBe('Tom');

      await area.delete('mycat');

      expect(await area.get('mycat')).toBe(undefined);
    });
  });
});

describe('storage', () => {
  it('should be an instance of StorageArea', () => {
    expect(storage instanceof StorageArea).toBe(true);
  });
});
