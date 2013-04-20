describe 'buffer', ->

  describe 'trimming whitespace', ->

    beforeEach ->
      @buffer = new haml.Buffer(null)

    it 'trims the whitespace from the end of the string', ->
      @buffer.append("some text to trim \t\n")
      @buffer.trimWhitespace()
      expect(@buffer.buffer).toEqual("some text to trim")

    it 'trims down to the empty string', ->
      @buffer.append("     \t\n  ")
      @buffer.trimWhitespace()
      expect(@buffer.buffer).toEqual("")

    it 'does not blow away single characters in the buffer', ->
      @buffer.append(">")
      @buffer.trimWhitespace()
      expect(@buffer.buffer).toEqual(">")