###
  Code generator that generates a coffeescript function body
###
class CoffeeCodeGenerator

  constructor: () ->
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

  appendCodeLine: (line) ->
    @outputBuffer.flush()
    @outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(@indent - @prevCodeIndent)) if @prevCodeIndent? and @prevCodeIndent < @indent
    @outputBuffer.appendToOutputBuffer(_(line).trim())
    @outputBuffer.appendToOutputBuffer('\n')
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
    if attributeHash.length > 0
      attributeHash = @replaceReservedWordsInHash(attributeHash)
      @outputBuffer.appendToOutputBuffer("hashFunction = () -> s = CoffeeScript.compile('" +
        attributeHash.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "', bare: true); eval 'hashObject = ' + s\n")
    if objectRef.length > 0
      @outputBuffer.appendToOutputBuffer("objRefFn = () -> s = CoffeeScript.compile('" +
        objectRef.replace(/'/g, "\\'") + "', bare: true); eval 'objRef = ' + s\n")

    @outputBuffer.appendToOutputBuffer("html.push(haml.HamlRuntime.generateElementAttributes(this, '" +
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

  escapeCode: (str) ->
    str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n').replace(/(^|[^\\]{2})\\\\#{/g, '$1\\#{')

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
    if @prevCodeIndent? and @prevIndent > @prevCodeIndent then HamlRuntime.indentText(@prevIndent - @prevCodeIndent) else ''

  ###
    Append the text contents to the buffer (interpolating embedded code not required for coffeescript)
  ###
  appendTextContents: (text, shouldInterpolate, currentParsePoint) ->
    if shouldInterpolate and text.match(/#{[^}]*}/)
      @outputBuffer.flush()
      @outputBuffer.appendToOutputBuffer(@calcCodeIndent() + 'html.push("' + @escapeCode(text) + '")\n')
    else
      @outputBuffer.append(text)