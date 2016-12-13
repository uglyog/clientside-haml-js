###
  Main haml compiler implemtation
###
haml =

  ###
    Compiles the haml provided in the parameters to a Javascipt function

    Parameter:
      String: Looks for a haml template in dom with this ID
      Option Hash: The following options determines how haml sources and compiles the template
        source - This contains the template in string form
        sourceId - This contains the element ID in the dom which contains the haml source
        sourceUrl - This contains the URL where the template can be fetched from
        outputFormat - This determines what is returned, and has the following values:
                         string - The javascript source code
                         function - A javascript function (default)
        generator - Which code generator to use
                         javascript (default)
                         coffeescript
                         productionjavascript
                         elementgenerator
        tolerateErrors - switch the compiler into fault tolerant mode (defaults to false)

    Returns a javascript function
  ###
  compileHaml: (options) ->
    if typeof options == 'string'
      @_compileHamlTemplate options, new haml.JsCodeGenerator()
    else
      codeGenerator = switch options.generator
        when 'coffeescript' then new haml.CoffeeCodeGenerator(options)
        when 'productionjavascript' then new haml.ProductionJsCodeGenerator(options)
        when 'elementgenerator' then new haml.ElementGenerator(options)
        else new haml.JsCodeGenerator(options)

      if options.source?
        tokinser = new haml.Tokeniser(template: options.source)
      else if options.sourceId?
        tokinser = new haml.Tokeniser(templateId: options.sourceId)
      else if options.sourceUrl?
        tokinser = new haml.Tokeniser(templateUrl: options.sourceUrl)
      else
        throw "No template source specified for compileHaml. You need to provide a source, sourceId or sourceUrl option"
      result = @_compileHamlToJs(tokinser, codeGenerator, options)
      if options.outputFormat isnt 'string'
        codeGenerator.generateJsFunction(result)
      else
        "function (context) {\n#{result}}\n"

  ###
    Compiles the haml in the script block with ID templateId using the coffeescript generator
    Returns a javascript function
  ###
  compileCoffeeHaml: (templateId) ->
    @_compileHamlTemplate templateId, new haml.CoffeeCodeGenerator()

  ###
    Compiles the haml in the passed in string
    Returns a javascript function
  ###
  compileStringToJs: (string) ->
    codeGenerator = new haml.JsCodeGenerator()
    result = @_compileHamlToJs new haml.Tokeniser(template: string), codeGenerator
    codeGenerator.generateJsFunction(result)

  ###
    Compiles the haml in the passed in string using the coffeescript generator
    Returns a javascript function
  ###
  compileCoffeeHamlFromString: (string) ->
    codeGenerator = new haml.CoffeeCodeGenerator()
    result = @_compileHamlToJs new haml.Tokeniser(template: string), codeGenerator
    codeGenerator.generateJsFunction(result)

  ###
    Compiles the haml in the passed in string
    Returns the javascript function source

    This is mainly used for precompiling the haml templates so they can be packaged.
  ###
  compileHamlToJsString: (string) ->
    result = 'function (context) {\n'
    result += @_compileHamlToJs new haml.Tokeniser(template: string), new haml.JsCodeGenerator()
    result += '}\n'

  _compileHamlTemplate: (templateId, codeGenerator) ->
    haml.cache ||= {}

    return haml.cache[templateId] if haml.cache[templateId]

    result = @_compileHamlToJs new haml.Tokeniser(templateId: templateId), codeGenerator
    fn = codeGenerator.generateJsFunction(result)
    haml.cache[templateId] = fn
    fn

  _compileHamlToJs: (tokeniser, generator, options = {}) ->
    generator.elementStack = []

    generator.initOutput()

    # HAML -> WS* (
    #          TEMPLATELINE
    #          | DOCTYPE
    #          | IGNOREDLINE
    #          | EMBEDDEDJS
    #          | JSCODE
    #          | COMMENTLINE
    #         )* EOF
    tokeniser.getNextToken()
    while !tokeniser.token.eof
      if !tokeniser.token.eol
        try
          indent = @_whitespace(tokeniser)
          generator.setIndent(indent)
          if tokeniser.token.eol
            generator.outputBuffer.append(HamlRuntime.indentText(indent) + tokeniser.token.matched)
            tokeniser.getNextToken()
          else if tokeniser.token.doctype
            @_doctype(tokeniser, indent, generator)
          else if tokeniser.token.exclamation
            @_ignoredLine(tokeniser, indent, generator.elementStack, generator)
          else if tokeniser.token.equal or tokeniser.token.escapeHtml or tokeniser.token.unescapeHtml or
          tokeniser.token.tilde
            @_embeddedJs(tokeniser, indent, generator.elementStack, innerWhitespace: true, generator)
          else if tokeniser.token.minus
            @_jsLine(tokeniser, indent, generator.elementStack, generator)
          else if tokeniser.token.comment or tokeniser.token.slash
            @_commentLine(tokeniser, indent, generator.elementStack, generator)
          else if tokeniser.token.amp
            @_escapedLine(tokeniser, indent, generator.elementStack, generator)
          else if tokeniser.token.filter
            @_filter(tokeniser, indent, generator, options)
          else
            @_templateLine(tokeniser, generator.elementStack, indent, generator, options)
        catch e
          @_handleError(options, skipTo: true, tokeniser, e)
      else
        generator.outputBuffer.append(tokeniser.token.matched)
        tokeniser.getNextToken()

    generator.closeElements(0, generator.elementStack, tokeniser, generator)
    generator.closeAndReturnOutput()


  _doctype: (tokeniser, indent, generator) ->
    if tokeniser.token.doctype
      generator.outputBuffer.append(HamlRuntime.indentText(indent))
      tokeniser.getNextToken()
      tokeniser.getNextToken() if tokeniser.token.ws
      contents = tokeniser.skipToEOLorEOF()
      if contents and contents.length > 0
        params = contents.split(/\s+/)
        switch params[0]
          when 'XML'
            if params.length > 1
              generator.outputBuffer.append("<?xml version='1.0' encoding='#{params[1]}' ?>")
            else
              generator.outputBuffer.append("<?xml version='1.0' encoding='utf-8' ?>")
          when 'Strict' then generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">')
          when 'Frameset' then generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">')
          when '5' then generator.outputBuffer.append('<!DOCTYPE html>')
          when '1.1' then generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">')
          when 'Basic' then generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">')
          when 'Mobile' then generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">')
          when 'RDFa' then generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML+RDFa 1.0//EN" "http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd">')
      else
        generator.outputBuffer.append('<!DOCTYPE html>')
      generator.outputBuffer.append(@_newline(tokeniser))
      tokeniser.getNextToken()

  _filter: (tokeniser, indent, generator, options) ->
    if tokeniser.token.filter
      filter = tokeniser.token.tokenString
      unless haml.filters[filter]
        @_handleError(options, skipTo: indent, tokeniser, tokeniser.parseError("Filter '#{filter}' not registered. Filter functions need to be added to 'haml.filters'."))
        return

      tokeniser.skipToEOLorEOF()
      tokeniser.getNextToken()
      i = haml._whitespace(tokeniser)
      filterBlock = []
      while (!tokeniser.token.eof and i > indent)
        tokeniser.pushBackToken()
        line = tokeniser.skipToEOLorEOF()
        filterBlock.push(HamlRuntime.trim(line, 2 * indent))
        tokeniser.getNextToken()
        i = haml._whitespace(tokeniser)
      haml.filters[filter](filterBlock, generator, indent, tokeniser.currentParsePoint())
      tokeniser.pushBackToken()

  _commentLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.comment
      tokeniser.skipToEOLorEOF()
      tokeniser.getNextToken()
      i = @_whitespace(tokeniser)
      while (!tokeniser.token.eof and i > indent)
        tokeniser.skipToEOLorEOF()
        tokeniser.getNextToken()
        i = @_whitespace(tokeniser)
      tokeniser.pushBackToken() if i > 0
    else if tokeniser.token.slash
      generator.closeElements(indent, elementStack, tokeniser, generator)
      generator.outputBuffer.append(HamlRuntime.indentText(indent))
      generator.outputBuffer.append("<!--")
      tokeniser.getNextToken()
      contents = tokeniser.skipToEOLorEOF()

      generator.outputBuffer.append(contents) if contents and contents.length > 0

      if contents and (_.str || _).startsWith(contents, '[') and contents.match(/\]\s*$/)
        elementStack[indent] = htmlConditionalComment: true, eol: @_newline(tokeniser)
        generator.outputBuffer.append(">")
      else
        elementStack[indent] = htmlComment: true, eol: @_newline(tokeniser)

      if haml._tagHasContents(indent, tokeniser)
        generator.outputBuffer.append("\n")
      tokeniser.getNextToken()

  _escapedLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.amp
      generator.closeElements(indent, elementStack, tokeniser, generator)
      generator.outputBuffer.append(HamlRuntime.indentText(indent))
      tokeniser.getNextToken()
      contents = tokeniser.skipToEOLorEOF()
      generator.outputBuffer.append(haml.HamlRuntime.escapeHTML(contents)) if (contents && contents.length > 0)
      generator.outputBuffer.append(@_newline(tokeniser))
      tokeniser.getNextToken()

  _ignoredLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.exclamation
      tokeniser.getNextToken()
      indent += haml._whitespace(tokeniser) if tokeniser.token.ws
      generator.closeElements(indent, elementStack, tokeniser, generator)
      contents = tokeniser.skipToEOLorEOF()
      generator.outputBuffer.append(HamlRuntime.indentText(indent) + contents)

  _embeddedJs: (tokeniser, indent, elementStack, tagOptions, generator) ->
    generator.closeElements(indent, elementStack, tokeniser, generator) if elementStack
    if tokeniser.token.equal or tokeniser.token.escapeHtml or tokeniser.token.unescapeHtml or tokeniser.token.tilde
      escapeHtml = tokeniser.token.escapeHtml or tokeniser.token.equal
      perserveWhitespace = tokeniser.token.tilde
      currentParsePoint = tokeniser.currentParsePoint()
      tokeniser.getNextToken()
      expression = tokeniser.skipToEOLorEOF()
      indentText = HamlRuntime.indentText(indent)
      generator.outputBuffer.append(indentText) if !tagOptions or tagOptions.innerWhitespace
      generator.appendEmbeddedCode(indentText, expression, escapeHtml, perserveWhitespace, currentParsePoint)
      if !tagOptions or tagOptions.innerWhitespace
        generator.outputBuffer.append(@_newline(tokeniser))
        tokeniser.getNextToken() if tokeniser.token.eol

  _jsLine: (tokeniser, indent, elementStack, generator) ->
    if tokeniser.token.minus
      generator.closeElements(indent, elementStack, tokeniser, generator)
      tokeniser.getNextToken()
      line = tokeniser.skipToEOLorEOF()
      generator.setIndent(indent)
      generator.appendCodeLine(line, @_newline(tokeniser))
      tokeniser.getNextToken() if tokeniser.token.eol

      if generator.lineMatchesStartFunctionBlock(line)
        elementStack[indent] = fnBlock: true
      else if generator.lineMatchesStartBlock(line)
        elementStack[indent] = block: true

  # TEMPLATELINE -> ([ELEMENT][IDSELECTOR][CLASSSELECTORS][ATTRIBUTES] [SLASH|CONTENTS])|(!CONTENTS) (EOL|EOF)
  _templateLine: (tokeniser, elementStack, indent, generator, options) ->
    generator.closeElements(indent, elementStack, tokeniser, generator) unless tokeniser.token.eol

    identifier = @_element(tokeniser)
    id = @_idSelector(tokeniser)
    classes = @_classSelector(tokeniser)

    # check to see if the id had been added after all classes
    id = @_idSelector(tokeniser) unless id

    objectRef = @_objectReference(tokeniser)
    attrList = @_attributeList(tokeniser, options)

    currentParsePoint = tokeniser.currentParsePoint()
    attributesHash = @_attributeHash(tokeniser)

    tagOptions =
      selfClosingTag: false
      innerWhitespace: true
      outerWhitespace: true
    lineHasElement = @_lineHasElement(identifier, id, classes)

    if tokeniser.token.slash
      tagOptions.selfClosingTag = true
      tokeniser.getNextToken()
    if tokeniser.token.gt and lineHasElement
      tagOptions.outerWhitespace = false
      tokeniser.getNextToken()
    if tokeniser.token.lt and lineHasElement
      tagOptions.innerWhitespace = false
      tokeniser.getNextToken()

    if lineHasElement
      if !tagOptions.selfClosingTag
        tagOptions.selfClosingTag = haml._isSelfClosingTag(identifier) and !haml._tagHasContents(indent, tokeniser)
      generator.openElement(currentParsePoint, indent, identifier, id, classes, objectRef, attrList, attributesHash, elementStack,
        tagOptions, generator)

    hasContents = false
    tokeniser.getNextToken() if tokeniser.token.ws

    if tokeniser.token.equal or tokeniser.token.escapeHtml or tokeniser.token.unescapeHtml
      @_embeddedJs(tokeniser, indent + 1, null, tagOptions, generator)
      hasContents = true
    else
      contents = ''
      shouldInterpolate = false
      if tokeniser.token.exclamation
        tokeniser.getNextToken()
        contents = tokeniser.skipToEOLorEOF()
      else
        contents = tokeniser.skipToEOLorEOF()
        contents = contents.substring(1) if contents.match(/^\\/)
        shouldInterpolate = true

      hasContents = contents.length > 0
      if hasContents
        if tagOptions.innerWhitespace and lineHasElement or (!lineHasElement and haml._parentInnerWhitespace(elementStack, indent))
          indentText = HamlRuntime.indentText(if identifier.length > 0 then indent + 1 else indent)
        else
          indentText = ''
          contents = (_.str || _).trim(contents)
        generator.appendTextContents(indentText + contents, shouldInterpolate, currentParsePoint)
        generator.outputBuffer.append(@_newline(tokeniser))

      @_eolOrEof(tokeniser)

    if tagOptions.selfClosingTag and hasContents
      @_handleError(options, null, tokeniser, haml.HamlRuntime.templateError(currentParsePoint.lineNumber, currentParsePoint.characterNumber,
              currentParsePoint.currentLine, "A self-closing tag can not have any contents"))

  _attributeHash: (tokeniser) ->
    attr = ''
    if tokeniser.token.attributeHash
      attr = tokeniser.token.tokenString
      tokeniser.getNextToken()
    attr

  _objectReference: (tokeniser) ->
    attr = ''
    if tokeniser.token.objectReference
      attr = tokeniser.token.tokenString
      tokeniser.getNextToken()
    attr

  # ATTRIBUTES -> ( ATTRIBUTE* )
  _attributeList: (tokeniser, options) ->
    attrList = {}
    if tokeniser.token.openBracket
      tokeniser.getNextToken()
      until tokeniser.token.closeBracket
        attr = haml._attribute(tokeniser)
        if attr
          attrList[attr.name] = attr.value
        else
          if tokeniser.token.ws or tokeniser.token.eol
            tokeniser.getNextToken()
          else if !tokeniser.token.closeBracket and !tokeniser.token.identifier
            @_handleError(options, null, tokeniser, tokeniser.parseError("Expecting either an attribute name to continue the attributes or a closing " +
              "bracket to end"))
            return attrList
      tokeniser.getNextToken()
    attrList

  # ATTRIBUTE -> IDENTIFIER WS* = WS* STRING
  _attribute: (tokeniser) ->
    attr = null

    if tokeniser.token.identifier
      name = tokeniser.token.tokenString
      tokeniser.getNextToken()
      haml._whitespace(tokeniser)

      return { name: name, value: '' } unless tokeniser.token.equal

      tokeniser.getNextToken();
      haml._whitespace(tokeniser)
      if !tokeniser.token.string and !tokeniser.token.identifier
        throw tokeniser.parseError("Expected a quoted string or an identifier for the attribute value")
      attr =
        name: name
        value: tokeniser.token.tokenString
      tokeniser.getNextToken()

    attr


  _isSelfClosingTag: (tag) ->
    tag in ['meta', 'img', 'link', 'script', 'br', 'hr']

  _tagHasContents: (indent, tokeniser) ->
    if !tokeniser.isEolOrEof()
      true
    else
      nextToken = tokeniser.lookAhead(1)
      nextToken.ws and nextToken.tokenString.length / 2 > indent

  _parentInnerWhitespace: (elementStack, indent) ->
    indent == 0 or (!elementStack[indent - 1] or !elementStack[indent - 1].tagOptions or elementStack[indent - 1].tagOptions.innerWhitespace)

  _lineHasElement: (identifier, id, classes) ->
    identifier.length > 0 or id.length > 0 or classes.length > 0

  hasValue: (value) ->
    value? && value isnt false

  attrValue: (attr, value) ->
    if attr in ['selected', 'checked', 'disabled'] then attr else value

  _whitespace: (tokeniser) ->
    indent = 0
    if tokeniser.token.ws
      indent = tokeniser.calculateIndent(tokeniser.token.tokenString)
      tokeniser.getNextToken()
    indent

  _element: (tokeniser) ->
    identifier = ''
    if tokeniser.token.element
      identifier = tokeniser.token.tokenString
      tokeniser.getNextToken()
    identifier

  _eolOrEof: (tokeniser) ->
    if tokeniser.token.eol or tokeniser.token.continueLine
      tokeniser.getNextToken()
    else if !tokeniser.token.eof
      throw tokeniser.parseError("Expected EOL or EOF")

  # IDSELECTOR = # ID
  _idSelector: (tokeniser) ->
    id = ''
    if tokeniser.token.idSelector
      id = tokeniser.token.tokenString
      tokeniser.getNextToken()
    id

  # CLASSSELECTOR = (.CLASS)+
  _classSelector: (tokeniser) ->
    classes = []

    while tokeniser.token.classSelector
      classes.push(tokeniser.token.tokenString)
      tokeniser.getNextToken()

    classes

  _newline: (tokeniser) ->
    if tokeniser.token.eol
      tokeniser.token.matched
    else if tokeniser.token.continueLine
      tokeniser.token.matched.substring(1)
    else
      "\n"

  _handleError: (options, action, tokeniser, error) ->
    if options?.tolerateFaults
      console.log(error)
      @_skipToNextLineWithIndent(tokeniser, action.skipTo) if action?.skipTo
    else
      throw error

  _skipToNextLineWithIndent: (tokeniser, indent) ->
    tokeniser.skipToEOLorEOF()
    tokeniser.getNextToken()
    lineIndent = @_whitespace(tokeniser)
    while lineIndent > indent
      tokeniser.skipToEOLorEOF()
      tokeniser.getNextToken()
      lineIndent = @_whitespace(tokeniser)
    tokeniser.pushBackToken()

haml.Tokeniser = Tokeniser
haml.Buffer = Buffer
haml.JsCodeGenerator = JsCodeGenerator
haml.ProductionJsCodeGenerator = ProductionJsCodeGenerator
haml.CoffeeCodeGenerator = CoffeeCodeGenerator
haml.ElementGenerator = ElementGenerator
haml.HamlRuntime = HamlRuntime
haml.filters = filters

if module?.exports?
  module.exports = haml
else
  root.haml = haml
