###
  Code generator that generates a coffeescript function body
###
class CoffeeCodeGenerator extends CodeGenerator

  constructor: (@options) ->
    @outputBuffer = new haml.Buffer(this)

  appendEmbeddedCode: (indentText, expression, escapeContents, perserveWhitespace, currentParsePoint) ->
    @outputBuffer.flush()
    indent = @calcCodeIndent()
    @outputBuffer.appendToOutputBuffer(indent + "try\n")
    @outputBuffer.appendToOutputBuffer(indent + "  exp = CoffeeScript.compile('" + expression.replace(/'/g, "\\'").replace(/\\n/g, '\\\\n') + "', bare: true)\n")
    @outputBuffer.appendToOutputBuffer(indent + "  value = eval(exp)\n")
    @outputBuffer.appendToOutputBuffer(indent + "  value ?= ''\n")
    if escapeContents
      @outputBuffer.appendToOutputBuffer(indent + "  html.push(haml.HamlRuntime.escapeHTML(String(value)))\n")
    else if perserveWhitespace
      @outputBuffer.appendToOutputBuffer(indent + "  html.push(haml.HamlRuntime.perserveWhitespace(String(value)))\n")
    else
      @outputBuffer.appendToOutputBuffer(indent + "  html.push(String(value))\n")

    @outputBuffer.appendToOutputBuffer(indent + "catch e \n");
    @outputBuffer.appendToOutputBuffer(indent + "  throw new Error(haml.HamlRuntime.templateError(" +
        currentParsePoint.lineNumber + ", " + currentParsePoint.characterNumber + ", '" +
        @escapeCode(currentParsePoint.currentLine) + "',\n")
    @outputBuffer.appendToOutputBuffer(indent + "    'Error evaluating expression - ' + e))\n")

  initOutput: () ->
    @outputBuffer.appendToOutputBuffer('html = []\n')

  closeAndReturnOutput: () ->
    @outputBuffer.flush()
    @outputBuffer.output() + 'return html.join("")\n'

  appendCodeLine: (line, eol) ->
    @outputBuffer.flush()
    @outputBuffer.appendToOutputBuffer(@calcCodeIndent())
    @outputBuffer.appendToOutputBuffer((_.str || _).trim(line))
    @outputBuffer.appendToOutputBuffer(eol)
    @prevCodeIndent = @indent

  lineMatchesStartFunctionBlock: (line) ->
    line.match(/\) [\-=]>\s*$/)

  lineMatchesStartBlock: (line) ->
    true

  closeOffCodeBlock: (tokeniser) ->
    @outputBuffer.flush()

  closeOffFunctionBlock: (tokeniser) ->
    @outputBuffer.flush()

  generateCodeForDynamicAttributes: (id, classes, attributeList, attributeHash, objectRef, currentParsePoint) ->
    @outputBuffer.flush()
    indent = @calcCodeIndent()
    if attributeHash.length > 0
      attributeHash = @replaceReservedWordsInHash(attributeHash)
      @outputBuffer.appendToOutputBuffer(indent + "hashFunction = () -> s = CoffeeScript.compile('" +
        attributeHash.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "', bare: true); eval 'hashObject = ' + s\n")
    if objectRef.length > 0
      @outputBuffer.appendToOutputBuffer(indent + "objRefFn = () -> s = CoffeeScript.compile('" +
        objectRef.replace(/'/g, "\\'") + "', bare: true); eval 'objRef = ' + s\n")

    @outputBuffer.appendToOutputBuffer(indent + "html.push(haml.HamlRuntime.generateElementAttributes(this, '" +
      id + "', ['" +
      classes.join("','") + "'], objRefFn ? null, " +
      JSON.stringify(attributeList) + ", hashFunction ? null, " +
      currentParsePoint.lineNumber + ", " + currentParsePoint.characterNumber + ", '" +
      @escapeCode(currentParsePoint.currentLine) + "'))\n")

  replaceReservedWordsInHash: (hash) ->
    resultHash = hash
    for reservedWord in ['class', 'for']
      resultHash = resultHash.replace(reservedWord + ':', "'" + reservedWord + "':")
    resultHash

  ###
    Escapes the string for insertion into the generated code. Embedded code blocks in strings must not be escaped
  ###
  escapeCode: (str) ->
    outString = ''
    index = 0
    result = @embeddedCodeBlockMatcher.exec(str)
    while result
      precheedingChar = str.charAt(result.index - 1) if result.index > 0
      precheedingChar2 = str.charAt(result.index - 2) if result.index > 1
      if precheedingChar is '\\' and precheedingChar2 isnt '\\'
        outString += @_escapeText(str.substring(index, result.index - 1)) unless result.index == 0
        outString += @_escapeText('\\' + result[0])
      else
        outString += @_escapeText(str.substring(index, result.index))
        outString += result[0]
      index = @embeddedCodeBlockMatcher.lastIndex
      result = @embeddedCodeBlockMatcher.exec(str)
    outString += @_escapeText(str.substring(index)) if index < str.length
    outString

  _escapeText: (text) ->
    text.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\\"').replace(/\n/g, '\\n').replace(/(^|[^\\]{2})\\\\#{/g, '$1\\#{')

  ###
    Generates the javascript function by compiling the given code with coffeescript compiler
  ###
  generateJsFunction: (functionBody) ->
    try
      fn = CoffeeScript.compile functionBody, bare: true
      new Function(fn)
    catch e
      throw "Incorrect embedded code has resulted in an invalid Haml function - #{e}\nGenerated Function:\n#{fn}"

  generateFlush: (bufferStr) ->
    @calcCodeIndent() + "html.push('" + @escapeCode(bufferStr) + "')\n"

  setIndent: (indent) -> @indent = indent

  mark: () -> @prevIndent = @indent

  calcCodeIndent: () ->
    codeIndent = 0
    (codeIndent += 1 if @elementStack[i]?.block or @elementStack[i]?.fnBlock) for i in [0..@indent]
    HamlRuntime.indentText(codeIndent)

  ###
    Append the text contents to the buffer (interpolating embedded code not required for coffeescript)
  ###
  appendTextContents: (text, shouldInterpolate, currentParsePoint, options) ->
    if shouldInterpolate and text.match(/#{[^}]*}/)
      @outputBuffer.flush()
      prefix = suffix = ''
      if options?.escapeHTML
        prefix = 'haml.HamlRuntime.escapeHTML('
        suffix = ')'
      else if options?.perserveWhitespace
        prefix = 'haml.HamlRuntime.perserveWhitespace('
        suffix = ')'
      @outputBuffer.appendToOutputBuffer(@calcCodeIndent() + 'html.push(' + prefix + '"' + @escapeCode(text) + '"' + suffix + ')\n')
    else
      text = haml.HamlRuntime.escapeHTML(text) if options?.escapeHTML
      text = haml.HamlRuntime.perserveWhitespace(text) if options?.perserveWhitespace
      @outputBuffer.append(text)