class Tokeniser

  currentLineMatcher: /[^\n]*/g

  tokenMatchers:
    whitespace:       /[ \t]+/g,
    element:          /%[a-zA-Z][a-zA-Z0-9]*/g,
    idSelector:       /#[a-zA-Z_\-][a-zA-Z0-9_\-]*/g,
    classSelector:    /\.[a-zA-Z0-9_\-]+/g,
    identifier:       /[a-zA-Z][a-zA-Z0-9\-]*/g,
    quotedString:     /[\'][^\'\n]*[\']/g,
    quotedString2:    /[\"][^\"\n]*[\"]/g,
    comment:          /\-#/g,
    escapeHtml:       /\&=/g,
    unescapeHtml:     /\!=/g,
    objectReference:  /\[[a-zA-Z_][a-zA-Z0-9_]*\]/g,
    doctype:          /!!!/g

  constructor: (options) ->
    @buffer = null
    @bufferIndex = null
    @prevToken = null
    @token = null

    if options.templateId
      template = document.getElementById(options.templateId)
      if template
        @buffer = template.innerHTML
        @bufferIndex = 0
      else
        throw "Did not find a template with ID '" + options.templateId + "'"
    else if options.template
      @buffer = options.template
      @bufferIndex = 0

  matchToken: (matcher) ->
    matcher.lastIndex = @bufferIndex
    result = matcher.exec(@buffer)
    if result?.index == @bufferIndex then result[0]

  matchMultiCharToken: (matcher, token, tokenStr) ->
    if !@token
      matched = @matchToken(matcher)
      if matched
        @token = token
        @token.tokenString = tokenStr?(matched) ? matched
        @token.matched = matched
        @advanceCharsInBuffer(matched.length)

  matchSingleCharToken: (ch, token) ->
    if !@token and @buffer.charAt(@bufferIndex) == ch
        @token = token
        @token.tokenString = ch
        @token.matched = ch
        @advanceCharsInBuffer(1)

  getNextToken: () ->

    throw haml.HamlRuntime.templateError(@lineNumber, @characterNumber, @currentLine,
      "An internal parser error has occurred in the HAML parser") if isNaN(@bufferIndex)

    @prevToken = @token
    @token = null

    if @buffer == null or @buffer.length == @bufferIndex
      @token = { eof: true, token: 'EOF' }
    else
      @initLine()

      if !@token
        ch = @buffer.charCodeAt(@bufferIndex)
        ch1 = @buffer.charCodeAt(@bufferIndex + 1)
        if ch == 10 or (ch == 13 and ch1 == 10)
          @token = { eol: true, token: 'EOL' }
          if ch == 13 and ch1 == 10
            @advanceCharsInBuffer(2)
            @token.matched = String.fromCharCode(ch) + String.fromCharCode(ch1)
          else
            @advanceCharsInBuffer(1)
            @token.matched = String.fromCharCode(ch)
          @characterNumber = 0
          @currentLine = @getCurrentLine()

      @matchMultiCharToken(@tokenMatchers.whitespace, { ws: true, token: 'WS' })
      @matchMultiCharToken(@tokenMatchers.element, { element: true, token: 'ELEMENT' }, (matched) -> matched.substring(1) )
      @matchMultiCharToken(@tokenMatchers.idSelector, { idSelector: true, token: 'ID' }, (matched) -> matched.substring(1) )
      @matchMultiCharToken(@tokenMatchers.classSelector, { classSelector: true, token: 'CLASS' }, (matched) -> matched.substring(1) )
      @matchMultiCharToken(@tokenMatchers.identifier, { identifier: true, token: 'IDENTIFIER' })
      @matchMultiCharToken(@tokenMatchers.doctype, { doctype: true, token: 'DOCTYPE' })

      if !@token
        str = @matchToken(@tokenMatchers.quotedString)
        str = @matchToken(@tokenMatchers.quotedString2) if not str
        if str
          @token = { string: true, token: 'STRING', tokenString: str.substring(1, str.length - 1), matched: str }
          @advanceCharsInBuffer(str.length)

      @matchMultiCharToken(@tokenMatchers.comment, { comment: true, token: 'COMMENT' })
      @matchMultiCharToken(@tokenMatchers.escapeHtml, { escapeHtml: true, token: 'ESCAPEHTML' })
      @matchMultiCharToken(@tokenMatchers.unescapeHtml, { unescapeHtml: true, token: 'UNESCAPEHTML' })
      @matchMultiCharToken(@tokenMatchers.objectReference, { objectReference: true, token: 'OBJECTREFERENCE' }, (matched) ->
        matched.substring(1, matched.length - 1)
      )

      if !@token
        if @buffer and @buffer.charAt(@bufferIndex) == '{'
          i = @bufferIndex + 1
          characterNumberStart = @characterNumber
          lineNumberStart = @lineNumber
          braceCount = 1
          while i < @buffer.length and (braceCount > 1 or @buffer.charAt(i) isnt '}')
            if @buffer.charAt(i) == '{'
              braceCount++
            else if @buffer.charAt(i) == '}'
              braceCount--
            i++
          if i == @buffer.length
            @characterNumber = characterNumberStart + 1
            @lineNumber = lineNumberStart
            throw @parseError('Error parsing attribute hash - Did not find a terminating "}"')
          else
            @token =
              attributeHash: true
              token: 'ATTRHASH'
              tokenString: @buffer.substring(@bufferIndex, i + 1)
              matched: @buffer.substring(@bufferIndex, i + 1)
            @advanceCharsInBuffer(i - @bufferIndex + 1)

      @matchSingleCharToken('(', { openBracket: true, token: 'OPENBRACKET' })
      @matchSingleCharToken(')', { closeBracket: true, token: 'CLOSEBRACKET' })
      @matchSingleCharToken('=', { equal: true, token: 'EQUAL' })
      @matchSingleCharToken('/', { slash: true, token: 'SLASH' })
      @matchSingleCharToken('!', { exclamation: true, token: 'EXCLAMATION' })
      @matchSingleCharToken('-', { minus: true, token: 'MINUS' })
      @matchSingleCharToken('&', { amp: true, token: 'AMP' })
      @matchSingleCharToken('<', { lt: true, token: 'LT' })
      @matchSingleCharToken('>', { gt: true, token: 'GT' })
      @matchSingleCharToken('~', { tilde: true, token: 'TILDE' })

      @token = { unknown: true, token: 'UNKNOWN' } if @token == null

    @token

  lookAhead: (numberOfTokens) ->
    token = null
    if numberOfTokens > 0
      currentToken = @token
      prevToken = @prevToken
      currentLine = @currentLine
      lineNumber = @lineNumber
      characterNumber = @characterNumber
      bufferIndex = @bufferIndex

      i = 0
      token = this.getNextToken() while i++ < numberOfTokens

      @token = currentToken
      @prevToken = prevToken
      @currentLine = currentLine
      @lineNumber = lineNumber
      @characterNumber = characterNumber
      @bufferIndex = bufferIndex
    token

  initLine: () ->
    if !@currentLine and @currentLine isnt ""
      @currentLine = @getCurrentLine()
      @lineNumber = 1
      @characterNumber = 0

  getCurrentLine: (index) ->
      @currentLineMatcher.lastIndex = @bufferIndex + (index ? 0)
      line = @currentLineMatcher.exec(@buffer)
      if line then line[0] else ''

  parseError: (error) ->
    haml.HamlRuntime.templateError(@lineNumber, @characterNumber, @currentLine, error)

  skipToEOLorEOF: () ->
    text = ''

    if !@token.eof && !@token.eol
      @currentLineMatcher.lastIndex = @bufferIndex
      line = @currentLineMatcher.exec(@buffer)
      if line and line.index == @bufferIndex
        text = line[0]
        @advanceCharsInBuffer(text.length)
        @getNextToken()

    text

  advanceCharsInBuffer: (numChars) ->
    i = 0
    while i < numChars
      ch = @buffer.charCodeAt(@bufferIndex + i)
      ch1 = @buffer.charCodeAt(@bufferIndex + i + 1)
      if ch == 13 and ch1 == 10
        @lineNumber++
        @characterNumber = 0
        @currentLine = @getCurrentLine(i)
        i++
      else if ch == 10
        @lineNumber++
        @characterNumber = 0
        @currentLine = @getCurrentLine(i)
      else
        @characterNumber++
      i++
    @bufferIndex += numChars

  currentParsePoint: () ->
    {
      lineNumber: @lineNumber,
      characterNumber: @characterNumber,
      currentLine: @currentLine
    }

  pushBackToken: () ->
    if !@token.unknown
      @bufferIndex -= @token.matched.length
      @token = @prevToken