class Tokeniser
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

    `
    this.tokenMatchers = {
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
      objectReference:  /\[[a-zA-Z_][a-zA-Z0-9_]*\]/g
    };

    this.matchToken = function (matcher) {
      matcher.lastIndex = this.bufferIndex;
      var result = matcher.exec(this.buffer);
      if (result && result.index === this.bufferIndex) {
        return result[0];
      }
      return null;
    };

    this.getNextToken = function () {

      if (isNaN(this.bufferIndex)) {
        throw haml.HamlRuntime.templateError(this.lineNumber, this.characterNumber, this.currentLine,
                "An internal parser error has occurred in the HAML parser");
      }

      this.prevToken = this.token;
      this.token = null;

      if (this.buffer === null || this.buffer.length === this.bufferIndex) {
        this.token = { eof: true, token: 'EOF' };
      } else {
        this.initLine();

        if (!this.token) {
          var ch = this.buffer.charCodeAt(this.bufferIndex);
          var ch1 = this.buffer.charCodeAt(this.bufferIndex + 1);
          if (ch === 10 || (ch === 13 && ch1 === 10)) {
            this.token = { eol: true, token: 'EOL' };
            if (ch === 13 && ch1 === 10) {
              this.advanceCharsInBuffer(2);
              this.token.matched = String.fromCharCode(ch) + String.fromCharCode(ch1);
            } else {
              this.advanceCharsInBuffer(1);
              this.token.matched = String.fromCharCode(ch);
            }
            this.characterNumber = 0;
            this.currentLine = this.getCurrentLine();
          }
        }

        if (!this.token) {
          var ws = this.matchToken(this.tokenMatchers.whitespace);
          if (ws) {
            this.token = { ws: true, token: 'WS', tokenString: ws, matched: ws };
            this.advanceCharsInBuffer(ws.length);
          }
        }

        if (!this.token) {
          var element = this.matchToken(this.tokenMatchers.element);
          if (element) {
            this.token = { element: true, token: 'ELEMENT', tokenString: element.substring(1),
              matched: element };
            this.advanceCharsInBuffer(element.length);
          }
        }

        if (!this.token) {
          var id = this.matchToken(this.tokenMatchers.idSelector);
          if (id) {
            this.token = { idSelector: true, token: 'ID', tokenString: id.substring(1), matched: id };
            this.advanceCharsInBuffer(id.length);
          }
        }

        if (!this.token) {
          var c = this.matchToken(this.tokenMatchers.classSelector);
          if (c) {
            this.token = { classSelector: true, token: 'CLASS', tokenString: c.substring(1), matched: c };
            this.advanceCharsInBuffer(c.length);
          }
        }

        if (!this.token) {
          var identifier = this.matchToken(this.tokenMatchers.identifier);
          if (identifier) {
            this.token = { identifier: true, token: 'IDENTIFIER', tokenString: identifier, matched: identifier };
            this.advanceCharsInBuffer(identifier.length);
          }
        }

        if (!this.token) {
          var str = this.matchToken(this.tokenMatchers.quotedString);
          if (!str) {
            str = this.matchToken(this.tokenMatchers.quotedString2);
          }
          if (str) {
            this.token = { string: true, token: 'STRING', tokenString: str.substring(1, str.length - 1),
              matched: str };
            this.advanceCharsInBuffer(str.length);
          }
        }

        if (!this.token) {
          var comment = this.matchToken(this.tokenMatchers.comment);
          if (comment) {
            this.token = { comment: true, token: 'COMMENT', tokenString: comment, matched: comment};
            this.advanceCharsInBuffer(comment.length);
          }
        }

        if (!this.token) {
          var escapeHtml = this.matchToken(this.tokenMatchers.escapeHtml);
          if (escapeHtml) {
            this.token = { escapeHtml: true, token: 'ESCAPEHTML', tokenString: escapeHtml, matched: escapeHtml};
            this.advanceCharsInBuffer(escapeHtml.length);
          }
        }

        if (!this.token) {
          var unescapeHtml = this.matchToken(this.tokenMatchers.unescapeHtml);
          if (unescapeHtml) {
            this.token = { unescapeHtml: true, token: 'UNESCAPEHTML', tokenString: unescapeHtml, matched: unescapeHtml};
            this.advanceCharsInBuffer(unescapeHtml.length);
          }
        }

        if (!this.token) {
          var objectReference = this.matchToken(this.tokenMatchers.objectReference);
          if (objectReference) {
            this.token = { objectReference: true, token: 'OBJECTREFERENCE', tokenString: objectReference.substring(1,
              objectReference.length - 1), matched: objectReference};
            this.advanceCharsInBuffer(objectReference.length);
          }
        }

        if (!this.token) {
          if (this.buffer && this.buffer.charAt(this.bufferIndex) === '{') {
            var i = this.bufferIndex + 1;
            var characterNumberStart = this.characterNumber;
            var lineNumberStart = this.lineNumber;
            var braceCount = 1;
            while (i < this.buffer.length && (braceCount > 1 || this.buffer.charAt(i) !== '}')) {
              if (this.buffer.charAt(i) === '{') {
                braceCount++;
              } else if (this.buffer.charAt(i) === '}') {
                braceCount--;
              }
              i++;
            }
            if (i === this.buffer.length) {
              this.characterNumber = characterNumberStart + 1;
              this.lineNumber = lineNumberStart;
              throw this.parseError('Error parsing attribute hash - Did not find a terminating "}"');
            } else {
              this.token = { attributeHash: true, token: 'ATTRHASH',
                tokenString: this.buffer.substring(this.bufferIndex, i + 1),
                matched: this.buffer.substring(this.bufferIndex, i + 1) };
              this.advanceCharsInBuffer(i - this.bufferIndex + 1);
            }
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '(') {
            this.token = { openBracket: true, token: 'OPENBRACKET', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === ')') {
            this.token = { closeBracket: true, token: 'CLOSEBRACKET', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '=') {
            this.token = { equal: true, token: 'EQUAL', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '/') {
            this.token = { slash: true, token: 'SLASH', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '!') {
            this.token = { exclamation: true, token: 'EXCLAMATION', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '-') {
            this.token = { minus: true, token: 'MINUS', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '&') {
            this.token = { amp: true, token: 'AMP', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '<') {
            this.token = { lt: true, token: 'LT', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '>') {
            this.token = { gt: true, token: 'GT', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '~') {
            this.token = { tilde: true, token: 'TILDE', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (this.token === null) {
          this.token = { unknown: true, token: 'UNKNOWN' };
        }
      }
      return this.token;
    };

    this.lookAhead = function (numberOfTokens) {
      var token = null;
      if (numberOfTokens > 0) {
        var currentToken = this.token;
        var prevToken = this.prevToken;
        var currentLine = this.currentLine;
        var lineNumber = this.lineNumber;
        var characterNumber = this.characterNumber;
        var bufferIndex = this.bufferIndex;

        for (var i = 0; i < numberOfTokens; i++) {
          token = this.getNextToken();
        }

        this.token = currentToken;
        this.prevToken = prevToken;
        this.currentLine = currentLine;
        this.lineNumber = lineNumber;
        this.characterNumber = characterNumber;
        this.bufferIndex = bufferIndex;
      }
      return token;
    };

    this.initLine = function () {
      if (!this.currentLine && this.currentLine !== "") {
        this.currentLine = this.getCurrentLine();
        this.lineNumber = 1;
        this.characterNumber = 0;
      }
    };

    this.currentLineMatcher = /[^\n]*/g;
    this.getCurrentLine = function (index) {
      var i = index || 0;
      this.currentLineMatcher.lastIndex = this.bufferIndex + i;
      var line = this.currentLineMatcher.exec(this.buffer);
      if (line) {
        return line[0];
      }
      else {
        return '';
      }
    };
    `

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