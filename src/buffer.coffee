###
  Provides buffering between the generated javascript and html contents
###
class Buffer
  constructor: (@generator) ->
    @buffer = ''
    @outputBuffer = ''

  append: (str) ->
    @generator.mark() if @generator? and @buffer.length == 0
    @buffer += str if str?.length > 0

  appendToOutputBuffer: (str) ->
    if str?.length > 0
      @flush()
      @outputBuffer += str

  flush: () ->
    @outputBuffer += @generator.generateFlush(@buffer) if @buffer?.length > 0
    @buffer = ''

  output: () ->
    @outputBuffer

  trimWhitespace: () ->
    if @buffer.length > 0
      i = @buffer.length - 1
      while i > 0
        ch = @buffer.charAt(i)
        if @_isWhitespace(ch)
          i--
        else if i > 1 and (ch == 'n' or ch == 't') and (@buffer.charAt(i - 1) == '\\')
          i -= 2
        else
          break
      if i > 0 and i < @buffer.length - 1
        @buffer = @buffer.substring(0, i + 1)
      else if i == 0 and @_isWhitespace(@buffer.charAt(0))
        @buffer = ''

  _isWhitespace: (ch) ->
    ch == ' ' or ch == '\t' or ch == '\n'
