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

  describe 'with an self-closing tag with content', ->

    beforeEach ->
      @haml = '''
              .p/ test
              '''

    it 'raises an exception in normal mode', ->
      expect(=> haml.compileHaml(source: @haml)()).toThrow()

    it 'does not raise an exception in fault tolerant mode', ->
      expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
      expect(@result).toBe('<div class="p"/>\ntest\n')

  describe 'with no closing attribute list', ->

    beforeEach ->
      @haml = '''
              .p(a="b"
              '''

    it 'raises an exception in normal mode', ->
      expect(=> haml.compileHaml(source: @haml)()).toThrow()

    it 'does not raise an exception in fault tolerant mode', ->
      expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
      expect(@result).toBe('<div class="p" a="b">\n</div>\n')

  describe 'with an invalid attribute list', ->

    beforeEach ->
      @haml = '.p(a="b" =)'

    it 'raises an exception in normal mode', ->
      expect(=> haml.compileHaml(source: @haml)()).toThrow()

    it 'does not raise an exception in fault tolerant mode', ->
      expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
      expect(_.str.trim(haml.compileHaml(source: @haml, tolerateFaults: true)())).toEqual('<div class="p" a="b">\n  \n</div>')

  describe 'with a missing closing bracket', ->

    beforeEach ->
      @haml = '''
                 .p(a="b"
                   .o Something not seen
                 .r(a="b")
                   You should see me
                 .q
                   You should see me
              '''

    it 'raises an exception in normal mode', ->
      expect(=> haml.compileHaml(source: @haml)()).toThrow()

    it 'does not raise an exception in fault tolerant mode', ->
      expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
      expect(_.str.trim(haml.compileHaml(source: @haml, tolerateFaults: true)())).toEqual(
        '''<div class="p" a="b">
           .o Something not seen
           </div>
           <div class="r" a="b">
             You should see me
           </div>
           <div class="q">
             You should see me
           </div>
        '''
      )

  describe 'with a missing closing brace', ->

    beforeEach ->
      @haml = '''
                 .p{a: "b"
                   .o Something not seen
                 .r{a: "b"}
                   You should see me
                 .q
                   You should see me
              '''

    xit 'raises an exception in normal mode', ->
      expect(=> haml.compileHaml(source: @haml)()).toThrow()

    xit 'does not raise an exception in fault tolerant mode', ->
      expect(=> @result = haml.compileHaml(source: @haml, tolerateFaults: true)()).not.toThrow()
      expect(_.str.trim(haml.compileHaml(source: @haml, tolerateFaults: true)())).toEqual(
        '''<div class="p" a="b">
           .o Something not seen
           </div>
           <div class="r" a="b">
             You should see me
           </div>
           <div class="q">
             You should see me
           </div>
        '''
      )
