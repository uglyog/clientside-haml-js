root = this

root.haml =
  compileHaml: (templateId) ->
    haml.cache ||= {}

    return haml.cache[templateId] if haml.cache[templateId]

    result = @compileHamlToJs new haml.Tokeniser(templateId: templateId), new haml.JsCodeGenerator()

    fn = null
    try
      fn = new Function('context', result)
    catch e
      throw "Incorrect embedded code has resulted in an invalid Haml function - #{e}\nGenerated Function:\n#{result}"

    haml.cache[templateId] = fn

  compileStringToJs: (string) ->
    result = @compileHamlToJs new haml.Tokeniser(template: string), new haml.JsCodeGenerator()

    try
      return new Function('context', result)
    catch e
      throw "Incorrect embedded code has resulted in an invalid Haml function - #{e}\nGenerated Function:\n#{result}"

  compileHamlToJsString: (string) ->
    result = 'function (context) {\n'
    result += @compileHamlToJs new haml.Tokeniser(template: string), new haml.JsCodeGenerator()
    result += '}\n'

  compileHamlToJs: (tokeniser, generator) ->
    elementStack = []

    generator.initOutput()

    # HAML -> WS* (
    #          TEMPLATELINE
    #          | IGNOREDLINE
    #          | EMBEDDEDJS
    #          | JSCODE
    #          | COMMENTLINE
    #         )* EOF
    tokeniser.getNextToken()
    while !tokeniser.token.eof

      if !tokeniser.token.eol
        indent = haml.whitespace(tokeniser)
        if tokeniser.token.exclamation
          haml.ignoredLine(tokeniser, indent, elementStack, generator)
        else if tokeniser.token.equal or tokeniser.token.escapeHtml or tokeniser.token.unescapeHtml or
        tokeniser.token.tilde
          haml.embeddedJs(tokeniser, indent, elementStack, innerWhitespace: true, generator)
        else if tokeniser.token.minus
          haml.jsLine(tokeniser, indent, elementStack, generator)
        else if tokeniser.token.comment or tokeniser.token.slash
          haml.commentLine(tokeniser, indent, elementStack, generator)
        else if tokeniser.token.amp
          haml.escapedLine(tokeniser, indent, elementStack, generator)
        else
          haml.templateLine(tokeniser, elementStack, indent, generator)
      else
        tokeniser.getNextToken()

    haml.closeElements(0, elementStack, tokeniser, generator)
    generator.closeAndReturnOutput()

  commentLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.comment
      tokeniser.skipToEOLorEOF()
    else if tokeniser.token.slash
      haml.closeElements(indent, elementStack, tokeniser, generator)
      generator.outputBuffer.append(haml.indentText(indent))
      generator.outputBuffer.append("<!--")
      contents = tokeniser.skipToEOLorEOF()

      generator.outputBuffer.append(contents) if contents and contents.length > 0

      if contents and _(contents).startsWith('[') and contents.match(/\]\s*$/)
        elementStack[indent] = htmlConditionalComment: true
        generator.outputBuffer.append(">")
      else
        elementStack[indent] = htmlComment: true

      if haml.tagHasContents(indent, tokeniser)
        generator.outputBuffer.append("\\n")

  escapedLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.amp
      haml.closeElements(indent, elementStack, tokeniser, generator)
      generator.outputBuffer.append(haml.indentText(indent))
      contents = tokeniser.skipToEOLorEOF()
      generator.outputBuffer.append(haml.escapeHTML(contents)) if (contents && contents.length > 0)
      generator.outputBuffer.append("\\n")

  ignoredLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.exclamation
      tokeniser.getNextToken()
      indent += haml.whitespace(tokeniser) if (tokeniser.token.ws)
      tokeniser.pushBackToken()
      haml.closeElements(indent, elementStack, tokeniser, generator)
      contents = tokeniser.skipToEOLorEOF()
      generator.outputBuffer.append(haml.indentText(indent) + contents + '\\n')

  embeddedJs: (tokeniser, indent, elementStack, tagOptions, generator) ->
    haml.closeElements(indent, elementStack, tokeniser, generator) if elementStack
    if tokeniser.token.equal or tokeniser.token.escapeHtml or tokeniser.token.unescapeHtml or tokeniser.token.tilde
      escapeHtml = tokeniser.token.escapeHtml or tokeniser.token.equal
      perserveWhitespace = tokeniser.token.tilde
      currentParsePoint = tokeniser.currentParsePoint()
      expression = tokeniser.skipToEOLorEOF()
      indentText = haml.indentText(indent)
      generator.outputBuffer.append(indentText) if !tagOptions or tagOptions.innerWhitespace
      generator.appendEmbeddedCode(indentText, expression, escapeHtml, perserveWhitespace, currentParsePoint)
      generator.outputBuffer.append("\\n") if !tagOptions or tagOptions.innerWhitespace

  jsLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.minus
      haml.closeElements(indent, elementStack, tokeniser, generator)

      line = tokeniser.skipToEOLorEOF()
      generator.appendCodeLine(haml.indentText(indent), line)

      if generator.lineMatchesStartFunctionBlock(line)
        elementStack[indent] = fnBlock: true
      else if generator.lineMatchesStartBlock(line)
        elementStack[indent] = block: true

  # TEMPLATELINE -> ([ELEMENT][IDSELECTOR][CLASSSELECTORS][ATTRIBUTES] [SLASH|CONTENTS])|(!CONTENTS) (EOL|EOF)
  templateLine: (tokeniser, elementStack, indent, generator) ->
    haml.closeElements(indent, elementStack, tokeniser, generator) unless tokeniser.token.eol

    ident = haml.element(tokeniser)
    id = haml.idSelector(tokeniser)
    classes = haml.classSelector(tokeniser)
    objectRef = haml.objectReference(tokeniser)
    attrList = haml.attributeList(tokeniser)

    currentParsePoint = tokeniser.currentParsePoint()
    attributesHash = haml.attributeHash(tokeniser)

    tagOptions =
      selfClosingTag: false
      innerWhitespace: true
      outerWhitespace: true

    if tokeniser.token.slash
      tagOptions.selfClosingTag = true
      tokeniser.getNextToken()
    if tokeniser.token.gt and haml.lineHasElement(ident, id, classes)
      tagOptions.outerWhitespace = false
      tokeniser.getNextToken()
    if tokeniser.token.lt and haml.lineHasElement(ident, id, classes)
      tagOptions.innerWhitespace = false
      tokeniser.getNextToken()

    if haml.lineHasElement(ident, id, classes)
      if !tagOptions.selfClosingTag
        tagOptions.selfClosingTag = haml.isSelfClosingTag(ident) and !haml.tagHasContents(indent, tokeniser)
      haml.openElement(currentParsePoint, indent, ident, id, classes, objectRef, attrList, attributesHash, elementStack,
        tagOptions, generator)
    else if !haml.isEolOrEof(tokeniser) and !tokeniser.token.ws
      tokeniser.pushBackToken()

    contents = haml.elementContents(tokeniser, indent + 1, tagOptions, generator)
    haml.eolOrEof(tokeniser)

    if tagOptions.selfClosingTag and contents.length > 0
      throw haml.templateError(currentParsePoint.lineNumber, currentParsePoint.characterNumber,
              currentParsePoint.currentLine, "A self-closing tag can not have any contents")
    else if contents.length > 0
      contents = contents.substring(1) if contents.match(/^\\%/)
      if tagOptions.innerWhitespace and haml.lineHasElement(ident, id, classes) or
      (!haml.lineHasElement(ident, id, classes) and haml.parentInnerWhitespace(elementStack, indent))
        i = indent
        i += 1 if ident.length > 0
        generator.outputBuffer.append(haml.indentText(i) + contents + '\\n')
      else
        generator.outputBuffer.append(_(contents).trim() + '\\n')
    else if !haml.lineHasElement(ident, id, classes) and tagOptions.innerWhitespace
      generator.outputBuffer.append(haml.indentText(indent) + '\\n')

  elementContents: (tokeniser, indent, tagOptions, generator) ->
    contents = ''

    if !tokeniser.token.eof
      tokeniser.getNextToken() if tokeniser.token.ws

      if tokeniser.token.exclamation
        contents = tokeniser.skipToEOLorEOF()
      else if tokeniser.token.equal or tokeniser.token.escapeHtml or tokeniser.token.unescapeHtml
        haml.embeddedJs(tokeniser, indent, null, tagOptions, generator)
      else if !tokeniser.token.eol
        tokeniser.pushBackToken()
        contents = tokeniser.skipToEOLorEOF()

    contents

  attributeHash: (tokeniser) ->
    attr = ''
    if tokeniser.token.attributeHash
      attr = tokeniser.token.tokenString
      tokeniser.getNextToken()
    attr

  objectReference: (tokeniser) ->
    attr = ''
    if tokeniser.token.objectReference
      attr = tokeniser.token.tokenString
      tokeniser.getNextToken()
    attr

  # ATTRIBUTES -> ( ATTRIBUTE* )
  attributeList: (tokeniser) ->
    attrList = {}
    if tokeniser.token.openBracket
      tokeniser.getNextToken()
      until tokeniser.token.closeBracket
        attr = haml.attribute(tokeniser)
        if attr
          attrList[attr.name] = attr.value
        else
          tokeniser.getNextToken()
        if tokeniser.token.ws or tokeniser.token.eol
          tokeniser.getNextToken()
        else if !tokeniser.token.closeBracket and !tokeniser.token.identifier
          throw tokeniser.parseError("Expecting either an attribute name to continue the attibutes or a closing " +
            "bracket to end")
      tokeniser.getNextToken()
    attrList

  # ATTRIBUTE -> IDENTIFIER WS* = WS* STRING
  attribute: (tokeniser) ->
    attr = null

    if tokeniser.token.identifier
      name = tokeniser.token.tokenString
      tokeniser.getNextToken()
      haml.whitespace(tokeniser)
      throw tokeniser.parseError("Expected '=' after attribute name") unless tokeniser.token.equal
      tokeniser.getNextToken();
      haml.whitespace(tokeniser)
      if !tokeniser.token.string and !tokeniser.token.identifier
        throw tokeniser.parseError("Expected a quoted string or an identifier for the attribute value")
      attr =
        name: name
        value: tokeniser.token.tokenString
      tokeniser.getNextToken()

    attr

  closeElement: (indent, elementStack, tokeniser, generator) ->
    if elementStack[indent]
      if elementStack[indent].htmlComment
        generator.outputBuffer.append(haml.indentText(indent) + '-->\\n')
      else if elementStack[indent].htmlConditionalComment
        generator.outputBuffer.append(haml.indentText(indent) + '<![endif]-->\\n')
      else if elementStack[indent].block
        generator.closeOffCodeBlock(haml.indentText(indent)) if !tokeniser.token.minus or !tokeniser.matchToken(/\s*\}/g)
      else if elementStack[indent].fnBlock
        generator.closeOffFunctionBlock(haml.indentText(indent)) if !tokeniser.token.minus or !tokeniser.matchToken(/\s*\}/g)
      else
        innerWhitespace = !elementStack[indent].tagOptions or elementStack[indent].tagOptions.innerWhitespace
        if innerWhitespace
          generator.outputBuffer.append(haml.indentText(indent))
        else
          generator.outputBuffer.trimWhitespace()
        generator.outputBuffer.append('</' + elementStack[indent].tag + '>')
        outerWhitespace = !elementStack[indent].tagOptions or elementStack[indent].tagOptions.outerWhitespace
        generator.outputBuffer.append('\\n') if haml.parentInnerWhitespace(elementStack, indent) and outerWhitespace
      elementStack[indent] = null

  closeElements: (indent, elementStack, tokeniser, generator) ->
    i = elementStack.length - 1
    while i >= indent
      haml.closeElement(i--, elementStack, tokeniser, generator)

  openElement: (currentParsePoint, indent, ident, id, classes, objectRef, attributeList, attributeHash, elementStack, tagOptions, generator) ->
    element = if ident.length == 0 then "div" else ident

    parentInnerWhitespace = haml.parentInnerWhitespace(elementStack, indent)
    tagOuterWhitespace = !tagOptions or tagOptions.outerWhitespace
    generator.outputBuffer.trimWhitespace() unless tagOuterWhitespace
    generator.outputBuffer.append(haml.indentText(indent)) if indent > 0 and parentInnerWhitespace and tagOuterWhitespace
    generator.outputBuffer.append('<' + element)
    if attributeHash.length > 0 or objectRef.length > 0
      generator.generateCodeForDynamicAttributes(id, classes, attributeList, attributeHash, objectRef, currentParsePoint)
    else
      generator.outputBuffer.append(haml.generateElementAttributes(null, id, classes, null, attributeList, null,
        currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine))
    if tagOptions.selfClosingTag
      generator.outputBuffer.append("/>")
      generator.outputBuffer.append("\\n") if tagOptions.outerWhitespace
    else
      generator.outputBuffer.append(">")
      elementStack[indent] =
        tag: element
        tagOptions: tagOptions
      generator.outputBuffer.append("\\n") if tagOptions.innerWhitespace

  combineAttributes: (attributes, attrName, attrValue) ->
    if haml.hasValue(attrValue)
      if attrName == 'id' and attrValue.toString().length > 0
        if attributes and attributes.id instanceof Array
          attributes.id.unshift(attrValue)
        else if attributes and attributes.id
          attributes.id = [attributes.id, attrValue]
        else if attributes
          attributes.id = attrValue
        else
          attributes = id: attrValue
      else if attrName == 'for' and attrValue.toString().length > 0
        if attributes and attributes['for'] instanceof Array
          attributes['for'].unshift attrValue
        else if attributes and attributes['for']
          attributes['for'] = [attributes['for'], attrValue]
        else if attributes
          attributes['for'] = attrValue
        else
          attributes = 'for': attrValue
      else if attrName == 'class'
        classes = []
        if attrValue instanceof Array
          classes = classes.concat(attrValue)
        else
          classes.push(attrValue)
        if attributes and attributes['class']
          attributes['class'] = attributes['class'].concat(classes)
        else if attributes
          attributes['class'] = classes
        else
          attributes = 'class': classes
      else if attrName != 'id'
        attributes ||= {}
        attributes[attrName] = attrValue
    attributes

  isSelfClosingTag: (tag) ->
    tag in ['meta', 'img', 'link', 'script', 'br', 'hr']

  tagHasContents: (indent, tokeniser) ->
    if !haml.isEolOrEof(tokeniser)
      true
    else
      nextToken = tokeniser.lookAhead(1)
      nextToken.ws and nextToken.tokenString.length / 2 > indent

  parentInnerWhitespace: (elementStack, indent) ->
    indent == 0 or (!elementStack[indent - 1] or !elementStack[indent - 1].tagOptions or elementStack[indent - 1].tagOptions.innerWhitespace)

  lineHasElement: (ident, id, classes) ->
    ident.length > 0 or id.length > 0 or classes.length > 0

  generateElementAttributes: (context, id, classes, objRefFn, attrList, attrFunction, lineNumber, characterNumber, currentLine) ->
    attributes = {}

    attributes = haml.combineAttributes(attributes, 'id', id)
    if classes.length > 0 and classes[0].length > 0
      attributes = haml.combineAttributes(attributes, 'class', classes)

    if attrList
      for own attr of attrList
        attributes = haml.combineAttributes(attributes, attr, attrList[attr])

    if objRefFn
      try
        object = objRefFn.call(this, context)
        if object
          objectId = null
          if object.id
            objectId = object.id
          else if object.get
            objectId = object.get('id')
          attributes = haml.combineAttributes(attributes, 'id', objectId)
          className = null
          if object['class']
            className = object['class']
          else if object.get
            className = object.get('class')
          attributes = haml.combineAttributes(attributes, 'class', className)
      catch e
        throw haml.templateError(lineNumber, characterNumber, currentLine, "Error evaluating object reference - #{e}")

    if attrFunction
      try
        hash = attrFunction.call(this, context)
        if hash
          for own attr of hash
            if attr == 'data'
              dataAttributes = hash[attr]
              for own dataAttr of dataAttributes
                attributes = haml.combineAttributes(attributes, 'data-' + dataAttr, dataAttributes[dataAttr])
            else
              attributes = haml.combineAttributes(attributes, attr, hash[attr])
      catch ex
        throw haml.templateError(lineNumber, characterNumber, currentLine, "Error evaluating attribute hash - #{ex}")

    html = ''
    if attributes
      for own attr of attributes
        if haml.hasValue(attributes[attr])
          if (attr == 'id' or attr == 'for') and attributes[attr] instanceof Array
            html += ' ' + attr + '="' + _(attributes[attr]).flatten().join('-') + '"'
          else if attr == 'class' and attributes[attr] instanceof Array
            html += ' ' + attr + '="' + _(attributes[attr]).flatten().join(' ') + '"'
          else
            html += ' ' + attr + '="' + haml.attrValue(attr, attributes[attr]) + '"'
    html

  hasValue: (value) ->
    value? && value != false

  attrValue: (attr, value) ->
    if attr in ['selected', 'checked', 'disabled'] then attr else value

  indentText: (indent) ->
    text = ''
    i = 0
    while i < indent
      text += '  '
      i++
    text

  whitespace: (tokeniser) ->
    indent = 0
    if tokeniser.token.ws
      indent = tokeniser.token.tokenString.length / 2
      tokeniser.getNextToken()
    indent

  element: (tokeniser) ->
    ident = ''
    if tokeniser.token.element
      ident = tokeniser.token.tokenString
      tokeniser.getNextToken()
    ident

  eolOrEof: (tokeniser) ->
    if tokeniser.token.eol
      tokeniser.getNextToken()
    else if !tokeniser.token.eof
      throw tokeniser.parseError("Expected EOL or EOF")

  # IDSELECTOR = # ID
  idSelector: (tokeniser) ->
    id = ''
    if tokeniser.token.idSelector
      id = tokeniser.token.tokenString
      tokeniser.getNextToken()
    id

  # CLASSSELECTOR = (.CLASS)+
  classSelector: (tokeniser) ->
    classes = []

    while tokeniser.token.classSelector
      classes.push(tokeniser.token.tokenString)
      tokeniser.getNextToken()

    classes

  templateError: (lineNumber, characterNumber, currentLine, error) ->
    message = error + " at line " + lineNumber + " and character " + characterNumber +
            ":\n" + currentLine + '\n'
    i = 0
    while i < characterNumber - 1
      message += '-'
      i++
    message += '^'
    message

  isEolOrEof: (tokeniser) ->
    tokeniser.token.eol or tokeniser.token.eof

  perserveWhitespace: (str) ->
    re = /<[a-zA-Z]+>[^<]*<\/[a-zA-Z]+>/g
    out = ''
    i = 0
    result = re.exec(str)
    if result
      while result
        out += str.substring(i, result.index)
        out += result[0].replace(/\n/g, '&#x000A;')
        i = result.index + result[0].length
        result = re.exec(str)
      out += str.substring(i)
    else
      out = str
    out

  # taken from underscore.string.js escapeHTML
  escapeHTML: (str) ->
    String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, "&#39;")

`
_.extend(root.haml, {

  Tokeniser: function (options) {
    this.buffer = null;
    this.bufferIndex = null;
    this.prevToken = null;
    this.token = null;

    if (options.templateId) {
      var template = document.getElementById(options.templateId);
      if (template) {
        this.buffer = template.innerHTML;
        this.bufferIndex = 0;
      } else {
        throw "Did not find a template with ID '" + options.templateId + "'";
      }
    } else if (options.template) {
      this.buffer = options.template;
      this.bufferIndex = 0;
    }

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
        throw haml.templateError(this.lineNumber, this.characterNumber, this.currentLine,
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

    this.parseError = function (error) {
      return haml.templateError(this.lineNumber, this.characterNumber, this.currentLine, error);
    };

    this.skipToEOLorEOF = function () {
      var text = '';

      if (!this.token.eof && !this.token.eol) {
        this.currentLineMatcher.lastIndex = this.bufferIndex;
        var line = this.currentLineMatcher.exec(this.buffer);
        if (line && line.index === this.bufferIndex) {
          text = line[0];
          this.advanceCharsInBuffer(text.length);
          this.getNextToken();
        }
      }

      return text;
    };

    this.advanceCharsInBuffer = function (numChars) {
      for (var i = 0; i < numChars; i++) {
        var ch = this.buffer.charCodeAt(this.bufferIndex + i);
        var ch1 = this.buffer.charCodeAt(this.bufferIndex + i + 1);
        if (ch === 13 && ch1 === 10) {
          this.lineNumber++;
          this.characterNumber = 0;
          this.currentLine = this.getCurrentLine(i);
          i++;
        } else if (ch === 10) {
          this.lineNumber++;
          this.characterNumber = 0;
          this.currentLine = this.getCurrentLine(i);
        } else {
          this.characterNumber++;
        }
      }
      this.bufferIndex += numChars;
    };

    this.currentParsePoint = function () {
      return {
        lineNumber: this.lineNumber,
        characterNumber: this.characterNumber,
        currentLine: this.currentLine
      };
    };

    this.pushBackToken = function () {
      if (!this.token.unknown) {
        this.bufferIndex -= this.token.matched.length;
        this.token = this.prevToken;
      }
    };
  },

  Buffer: function (generator) {
    this.generator = generator;
    this.buffer = '';
    this.outputBuffer = '';

    this.append = function (str) {
      if (str && str.length > 0) {
        this.buffer += str;
      }
    };

    this.appendToOutputBuffer = function (str) {
      if (str && str.length > 0) {
        this.flush();
        this.outputBuffer += str;
      }
    };

    this.flush = function () {
      if (this.buffer && this.buffer.length > 0) {
        this.outputBuffer += '    html.push("' + this.generator.escapeJs(this.buffer) + '");\n';
      }
      this.buffer = '';
    };

    this.output = function () {
      return this.outputBuffer;
    };

    this.trimWhitespace = function () {
      if (this.buffer.length > 0) {
        var i = this.buffer.length - 1;
        while (i > 0) {
          var ch = this.buffer.charAt(i);
          if (ch === ' ' || ch === '\t' || ch === '\n') {
            i--;
          }
          else if (i > 1 && (ch === 'n' || ch === 't') && (this.buffer.charAt(i - 1) === '\\')) {
            i -= 2;
          } else {
            break;
          }
        }
        if (i > 0 && i < this.buffer.length - 1) {
          this.buffer = this.buffer.substring(0, i + 1);
        } else if (i === 0) {
          this.buffer = '';
        }
      }
    };
  },

  JsCodeGenerator: function () {
    this.outputBuffer = new haml.Buffer(this);

    this.initOutput = function () {
      this.outputBuffer.appendToOutputBuffer('  var html = [];\n' +
        '  var hashFunction = null, hashObject = null, objRef = null, objRefFn = null;\n  with (context) {\n');
    };

    this.closeAndReturnOutput = function () {
      this.outputBuffer.flush();
      return this.outputBuffer.output() + '  }\n  return html.join("");\n';
    };

    this.appendEmbeddedCode = function (indentText, expression, escapeContents, perserveWhitespace, currentParsePoint) {
      this.outputBuffer.flush();

      this.outputBuffer.appendToOutputBuffer(indentText + 'try {\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    var value = eval("' +
        expression.replace(/"/g, '\\"').replace(/\\n/g, '\\\\n') + '");\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    value = value === null ? "" : value;');
      if (escapeContents) {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.escapeHTML(String(value)));\n');
      } else if (perserveWhitespace) {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.perserveWhitespace(String(value)));\n');
      } else {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(String(value));\n');
      }
      this.outputBuffer.appendToOutputBuffer(indentText + '} catch (e) {\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '  throw new Error(haml.templateError(' +
              currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
              this.escapeJs(currentParsePoint.currentLine) + '",\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '}\n');
    };

    this.appendCodeLine = function (indentText, line) {
      this.outputBuffer.flush();
      this.outputBuffer.appendToOutputBuffer(indentText);
      this.outputBuffer.appendToOutputBuffer(line);
      this.outputBuffer.appendToOutputBuffer('\n');
    };

    this.lineMatchesStartFunctionBlock = function (line) {
      return line.match(/function\s\((,?\s*\w+)*\)\s*\{\s*$/);
    };

    this.lineMatchesStartBlock = function (line) {
      return line.match(/\{\s*$/);
    };

    this.closeOffCodeBlock = function (indentText) {
      this.outputBuffer.flush();
      this.outputBuffer.appendToOutputBuffer(indentText + '}\n');
    };

    this.closeOffFunctionBlock = function (indentText) {
      this.outputBuffer.flush();
      this.outputBuffer.appendToOutputBuffer(indentText + '});\n');
    };

    this.generateCodeForDynamicAttributes = function (id, classes, attributeList, attributeHash, objectRef,
                                                      currentParsePoint) {
      this.outputBuffer.flush();
      if (attributeHash.length > 0) {
        attributeHash = this.replaceReservedWordsInHash(attributeHash);
        this.outputBuffer.appendToOutputBuffer('    hashFunction = function () { return eval("hashObject = ' +
          attributeHash.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"); };\n');
      }
      if (objectRef.length > 0) {
        this.outputBuffer.appendToOutputBuffer('    objRefFn = function () { return eval("objRef = ' +
          objectRef.replace(/"/g, '\\"') + '"); };\n');
      }

      this.outputBuffer.appendToOutputBuffer('    html.push(haml.generateElementAttributes(context, "' +
        id + '", ["' +
        classes.join('","') + '"], objRefFn, ' +
        JSON.stringify(attributeList) + ', hashFunction, ' +
        currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
        this.escapeJs(currentParsePoint.currentLine) + '"));\n');
    };

    this.replaceReservedWordsInHash = function (hash) {
      var resultHash;

      resultHash = hash;
      _(['class', 'for']).each(function (reservedWord) {
        resultHash = resultHash.replace(reservedWord + ':', '"' + reservedWord + '":');
      });

      return resultHash;
    };

    this.escapeJs = function (jsStr) {
      return jsStr.replace(/"/g, '\\"');
    };
  }
});
`