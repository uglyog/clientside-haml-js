###
  Code generator that generates a Javascript function body
###
class JsCodeGenerator

  constructor: () ->
    @outputBuffer = new haml.Buffer(this)

  ###
    Append a line with embedded javascript code
  ###
  appendEmbeddedCode: (indentText, expression, escapeContents, perserveWhitespace, currentParsePoint) ->
    @outputBuffer.flush()

    @outputBuffer.appendToOutputBuffer(indentText + 'try {\n')
    @outputBuffer.appendToOutputBuffer(indentText + '    var value = eval("' +
      expression.replace(/"/g, '\\"').replace(/\\n/g, '\\\\n') + '");\n')
    @outputBuffer.appendToOutputBuffer(indentText + '    value = value === null ? "" : value;')
    if escapeContents
      @outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.HamlRuntime.escapeHTML(String(value)));\n')
    else if perserveWhitespace
      @outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.HamlRuntime.perserveWhitespace(String(value)));\n')
    else
      @outputBuffer.appendToOutputBuffer(indentText + '    html.push(String(value));\n')

    @outputBuffer.appendToOutputBuffer(indentText + '} catch (e) {\n');
    @outputBuffer.appendToOutputBuffer(indentText + '  throw new Error(haml.HamlRuntime.templateError(' +
      currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
      @escapeCode(currentParsePoint.currentLine) + '",\n')
    @outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n')
    @outputBuffer.appendToOutputBuffer(indentText + '}\n')

  ###
    Initilising the output buffer with any variables or code
  ###
  initOutput: () ->
    @outputBuffer.appendToOutputBuffer('  var html = [];\n' +
      '  var hashFunction = null, hashObject = null, objRef = null, objRefFn = null;\n  with (context || {}) {\n')

  ###
    Flush and close the output buffer and return the contents
  ###
  closeAndReturnOutput: () ->
    @outputBuffer.flush()
    @outputBuffer.output() + '  }\n  return html.join("");\n'

  ###
    Append a line of code to the output buffer
  ###
  appendCodeLine: (line) ->
    @outputBuffer.flush()
    @outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(@indent))
    @outputBuffer.appendToOutputBuffer(line)
    @outputBuffer.appendToOutputBuffer('\n')

  ###
    Does the current line end with a function declaration?
  ###
  lineMatchesStartFunctionBlock: (line) -> line.match(/function\s\((,?\s*\w+)*\)\s*\{\s*$/)

  ###
    Does the current line end with a starting code block
  ###
  lineMatchesStartBlock: (line) -> line.match(/\{\s*$/)

  ###
    Generate the code to close off a code block
  ###
  closeOffCodeBlock: (tokeniser) ->
    unless tokeniser.token.minus and tokeniser.matchToken(/\s*\}/g)
      @outputBuffer.flush()
      @outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(@indent) + '}\n')

  ###
    Generate the code to close off a function parameter
  ###
  closeOffFunctionBlock: (tokeniser) ->
    unless tokeniser.token.minus and tokeniser.matchToken(/\s*\}/g)
      @outputBuffer.flush()
      @outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(@indent) + '});\n')

  ###
    Generate the code for dynamic attributes ({} form)
  ###
  generateCodeForDynamicAttributes: (id, classes, attributeList, attributeHash, objectRef, currentParsePoint) ->
    @outputBuffer.flush()
    if attributeHash.length > 0
      attributeHash = @replaceReservedWordsInHash(attributeHash)
      @outputBuffer.appendToOutputBuffer('    hashFunction = function () { return eval("hashObject = ' +
        attributeHash.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"); };\n')
    if objectRef.length > 0
      @outputBuffer.appendToOutputBuffer('    objRefFn = function () { return eval("objRef = ' +
        objectRef.replace(/"/g, '\\"') + '"); };\n')

    @outputBuffer.appendToOutputBuffer('    html.push(haml.HamlRuntime.generateElementAttributes(context, "' +
      id + '", ["' +
      classes.join('","') + '"], objRefFn, ' +
      JSON.stringify(attributeList) + ', hashFunction, ' +
      currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
      @escapeCode(currentParsePoint.currentLine) + '"));\n')

  ###
    Clean any reserved words in the given hash
  ###
  replaceReservedWordsInHash: (hash) ->
    resultHash = hash
    for reservedWord in ['class', 'for']
      resultHash = resultHash.replace(reservedWord + ':', '"' + reservedWord + '":')
    resultHash

  ###
    Escape the line so it is safe to put into a javascript string
  ###
  escapeCode: (jsStr) ->
    jsStr.replace(/"/g, '\\"').replace(/\n/g, '\\n')

  ###
    Generate a function from the function body
  ###
  generateJsFunction: (functionBody) ->
    try
      new Function('context', functionBody)
    catch e
      throw "Incorrect embedded code has resulted in an invalid Haml function - #{e}\nGenerated Function:\n#{functionBody}"

  ###
    Generate the code required to support a buffer flush
  ###
  generateFlush: (bufferStr) -> '    html.push("' + @escapeCode(bufferStr) + '");\n'

  ###
    Set the current indent level
  ###
  setIndent: (indent) -> @indent = indent

  ###
    Save the current indent level if required
  ###
  mark: () ->

  ###
    Append the text contents to the buffer, interpolating any embedded code
  ###
  appendTextContents: (text, shouldInterpolate) ->
    if shouldInterpolate and text.match(/#{[^}]*}/)
      @outputBuffer.append(text)
    else
      @outputBuffer.append(text)