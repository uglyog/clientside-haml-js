describe 'error handling', ->

  describe 'with an js runtime error', ->

    beforeEach ->
      @haml = '''
              .value>< = null.toString()
              '''

    it 'raises an exception in normal mode', ->
      expect(=> haml.compileHaml(source: @haml)()).toThrow()

    it 'does not raise an exception in fault tolerant mode', ->
      expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
      expect(@result).toBe('<div class="value"></div>')

  describe 'with an error in the attribute hash', ->

    beforeEach ->
      @haml = '''
              .value{this is not a hash}><
              '''

    it 'raises an exception in normal mode', ->
      expect(=> haml.compileHaml(source: @haml)()).toThrow()

    it 'does not raise an exception in fault tolerant mode', ->
      expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
      expect(@result).toBe('<div class="value"></div>')

  describe 'with an unknown filter', ->

      beforeEach ->
        @haml = '''
                .p><
                  :unknown
                    this is not the filter you where looking for
                  test
                '''

      it 'raises an exception in normal mode', ->
        expect(=> haml.compileHaml(source: @haml)()).toThrow()

      it 'does not raise an exception in fault tolerant mode', ->
        expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
        expect(@result).toBe('<div class="p">test</div>')

