###
  HAML Tokiniser: This class is responsible for parsing the haml source into tokens
###
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
    objectReference:  /\[[a-zA-Z_@][a-zA-Z0-9_]*\]/g,
    doctype:          /!!!/g,
    continueLine:     /\|\s*\n/g,
    filter:           /:\w+/g

  constructor: (options) ->
    @buffer = null
    @bufferIndex = null
    @prevToken = null
    @token = null

    if options.templateId?
      template = document.getElementById(options.templateId)
      if template
        @buffer = template.text
        @bufferIndex = 0
      else
        throw "Did not find a template with ID '" + options.templateId + "'"
    else if options.template?
      @buffer = options.template
      @bufferIndex = 0
    else if options.templateUrl?
      errorFn = (jqXHR, textStatus, errorThrown) ->
        throw "Failed to fetch haml template at URL #{options.templateUrl}: #{textStatus} #{errorThrown}"
      successFn = (data) =>
        @buffer = data
        @bufferIndex = 0
      jQuery.ajax
        url: options.templateUrl
        success: successFn
        error: errorFn
        dataType: 'text'
        async: false
        beforeSend: (xhr) ->
          xhr.withCredentials = true

  ###
    Try to match a token with the given regexp
  ###
  matchToken: (matcher) ->
    matcher.lastIndex = @bufferIndex
    result = matcher.exec(@buffer)
    if result?.index == @bufferIndex then result[0]

  ###
    Match a multi-character token
  ###
  matchMultiCharToken: (matcher, token, tokenStr) ->
    if !@token
      matched = @matchToken(matcher)
      if matched
        @token = token
        @token.tokenString = tokenStr?(matched) ? matched
        @token.matched = matched
        @advanceCharsInBuffer(matched.length)

  ###
    Match a single character token
  ###
  matchSingleCharToken: (ch, token) ->
    if !@token and @buffer.charAt(@bufferIndex) == ch
        @token = token
        @token.tokenString = ch
        @token.matched = ch
        @advanceCharsInBuffer(1)

  ###
    Match and return the next token in the input buffer
  ###
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
      @matchMultiCharToken(@tokenMatchers.continueLine, { continueLine: true, token: 'CONTINUELINE' })
      @matchMultiCharToken(@tokenMatchers.element, { element: true, token: 'ELEMENT' }, (matched) -> matched.substring(1) )
      @matchMultiCharToken(@tokenMatchers.idSelector, { idSelector: true, token: 'ID' }, (matched) -> matched.substring(1) )
      @matchMultiCharToken(@tokenMatchers.classSelector, { classSelector: true, token: 'CLASS' }, (matched) -> matched.substring(1) )
      @matchMultiCharToken(@tokenMatchers.identifier, { identifier: true, token: 'IDENTIFIER' })
      @matchMultiCharToken(@tokenMatchers.doctype, { doctype: true, token: 'DOCTYPE' })
      @matchMultiCharToken(@tokenMatchers.filter, { filter: true, token: 'FILTER' }, (matched) -> matched.substring(1) )

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

  ###
    Look ahead a number of tokens and return the token found
  ###
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

  ###
    Initilise the line and character counters
  ###
  initLine: () ->
    if !@currentLine and @currentLine isnt ""
      @currentLine = @getCurrentLine()
      @lineNumber = 1
      @characterNumber = 0

  ###
    Returns the current line in the input buffer
  ###
  getCurrentLine: (index) ->
      @currentLineMatcher.lastIndex = @bufferIndex + (index ? 0)
      line = @currentLineMatcher.exec(@buffer)
      if line then line[0] else ''

  ###
    Returns an error string filled out with the line and character counters
  ###
  parseError: (error) ->
    haml.HamlRuntime.templateError(@lineNumber, @characterNumber, @currentLine, error)

  ###
    Skips to the end of the line and returns the string that was skipped
  ###
  skipToEOLorEOF: () ->
    text = ''
    unless @token.eof or @token.eol
      text += @token.matched unless @token.unknown
      @currentLineMatcher.lastIndex = @bufferIndex
      line = @currentLineMatcher.exec(@buffer)
      if line and line.index == @bufferIndex
        contents = (_.str || _).rtrim(line[0])
        if (_.str || _).endsWith(contents, '|')
          text += contents.substring(0, contents.length - 1)
          @advanceCharsInBuffer(contents.length - 1)
          @getNextToken()
          text += @parseMultiLine()
        else
          text += line[0]
          @advanceCharsInBuffer(line[0].length)
          @getNextToken()
    text

  ###
    Parses a multiline code block and returns the parsed text
  ###
  parseMultiLine: () ->
    text = ''
    while @token.continueLine
      @currentLineMatcher.lastIndex = @bufferIndex
      line = @currentLineMatcher.exec(@buffer)
      if line and line.index == @bufferIndex
        contents = (_.str || _).rtrim(line[0])
        if (_.str || _).endsWith(contents, '|')
          text += contents.substring(0, contents.length - 1)
          @advanceCharsInBuffer(contents.length - 1)
        @getNextToken()
    text

  ###
    Advances the input buffer pointer by a number of characters, updating the line and character counters
  ###
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

  ###
    Returns the current line and character counters
  ###
  currentParsePoint: () ->
    {
      lineNumber: @lineNumber,
      characterNumber: @characterNumber,
      currentLine: @currentLine
    }

  ###
    Pushes back the current token onto the front of the input buffer
  ###
  pushBackToken: () ->
    if !@token.unknown and !@token.eof
      @bufferIndex -= @token.matched.length
      @token = @prevToken

  ###
    Is the current token an end of line or end of input buffer
  ###
  isEolOrEof: () ->
    @token.eol or @token.eof