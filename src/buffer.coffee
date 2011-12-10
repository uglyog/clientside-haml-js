class Buffer
  constructor: (@generator) ->
    @buffer = ''
    @outputBuffer = ''

  append: (str) ->
     @buffer += str if str and str.length > 0

  appendToOutputBuffer: (str) ->
    if str and str.length > 0
      @flush()
      @outputBuffer += str

  flush: () ->
    if @buffer and @buffer.length > 0
      @outputBuffer += '    html.push("' + @generator.escapeJs(@buffer) + '");\n'
    @buffer = ''

  output: () ->
    @outputBuffer

  trimWhitespace: () ->
    if @buffer.length > 0
      i = @buffer.length - 1
      while i > 0
        ch = @buffer.charAt(i)
        if ch == ' ' or ch == '\t' or ch == '\n'
          i--
        else if i > 1 and (ch == 'n' or ch == 't') and (@buffer.charAt(i - 1) == '\\')
          i -= 2
        else
          break
      if i > 0 and i < @buffer.length - 1
        @buffer = @buffer.substring(0, i + 1)
      else if i == 0
        @buffer = ''