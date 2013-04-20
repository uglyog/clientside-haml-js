describe 'haml runtime', ->

  describe 'flattening hashes', ->

    describe 'with no root key', ->

      describe 'with non-hashes', ->

        it 'returns non-hash objects', ->
          expect(haml.HamlRuntime._flattenHash(null, null)).toEqual(null)
          expect(haml.HamlRuntime._flattenHash(null, 'string')).toEqual('string')
          expect(haml.HamlRuntime._flattenHash(null, true)).toEqual(true)
          date = new Date()
          expect(haml.HamlRuntime._flattenHash(null, date)).toEqual(date)
          expect(haml.HamlRuntime._flattenHash(null, [1,2,3,4])).toEqual([1,2,3,4])

      describe 'with hashes', ->

        it 'expands the values of the hash', ->
          expect(haml.HamlRuntime._flattenHash(null, a: 'a', b: true, c: [1,2,3], d: { a: 'a', b: 'b' })).toEqual(
            a: 'a', b: true, c: [1,2,3], 'd-a': 'a', 'd-b': 'b')

    describe 'with a root key', ->

      describe 'with non-hashes', ->

        it 'returns a hash with the key set to the passed object', ->
          expect(haml.HamlRuntime._flattenHash('a', null)).toEqual(a: null)
          expect(haml.HamlRuntime._flattenHash('b', 'string')).toEqual(b: 'string')
          expect(haml.HamlRuntime._flattenHash('c', true)).toEqual(c: true)
          date = new Date()
          expect(haml.HamlRuntime._flattenHash('d', date)).toEqual(d: date)
          expect(haml.HamlRuntime._flattenHash('e', [1,2,3,4])).toEqual(e: [1,2,3,4])

      describe 'with hashes', ->

        it 'expands the values of the hash adding the root key to all keys', ->
          expect(haml.HamlRuntime._flattenHash('t', a: 'a', b: true, c: [1,2,3], d: { a: 'a', b: 'b' })).toEqual(
            't-a': 'a', 't-b': true, 't-c': [1,2,3], 't-d-a': 'a', 't-d-b': 'b')

  describe 'detecting hashes', ->

    it 'detects hashes', ->
      expect(haml.HamlRuntime._isHash({})).toBeTruthy()
      expect(haml.HamlRuntime._isHash({'a': 'b'})).toBeTruthy()

    it 'ignores arrays', ->
      expect(haml.HamlRuntime._isHash([])).toBeFalsy()
      expect(haml.HamlRuntime._isHash([1,2,3,4])).toBeFalsy()

    it 'ignores null', ->
      expect(haml.HamlRuntime._isHash(null)).toBeFalsy()

    it 'ignores strings', ->
      expect(haml.HamlRuntime._isHash('')).toBeFalsy()

    it 'ignores numbers', ->
      expect(haml.HamlRuntime._isHash(1)).toBeFalsy()

    it 'ignores functions', ->
      expect(haml.HamlRuntime._isHash(->)).toBeFalsy()

    it 'ignores dates', ->
      expect(haml.HamlRuntime._isHash(new Date())).toBeFalsy()

    it 'ignores booleans', ->
      expect(haml.HamlRuntime._isHash(true)).toBeFalsy()
