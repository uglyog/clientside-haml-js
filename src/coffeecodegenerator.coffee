class CoffeCodeGenerator

  constructor: () ->
    @outputBuffer = new haml.Buffer(this)

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
        @escapeJs(currentParsePoint.currentLine) + '",\n')
    @outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n')
    @outputBuffer.appendToOutputBuffer(indentText + '}\n')

  initOutput: () ->
    @outputBuffer.appendToOutputBuffer('  var html = [];\n' +
      '  var hashFunction = null, hashObject = null, objRef = null, objRefFn = null;\n  with (context || {}) {\n')

  closeAndReturnOutput: () ->
    @outputBuffer.flush()
    @outputBuffer.output() + '  }\n  return html.join("");\n'

  appendCodeLine: (indentText, line) ->
    @outputBuffer.flush()
    @outputBuffer.appendToOutputBuffer(indentText)
    @outputBuffer.appendToOutputBuffer(line)
    @outputBuffer.appendToOutputBuffer('\n')

  lineMatchesStartFunctionBlock: (line) ->
    line.match(/function\s\((,?\s*\w+)*\)\s*\{\s*$/)

  lineMatchesStartBlock: (line) ->
    line.match(/\{\s*$/)

  closeOffCodeBlock: (indentText) ->
    @outputBuffer.flush()
    @outputBuffer.appendToOutputBuffer(indentText + '}\n')

  closeOffFunctionBlock: (indentText) ->
    @outputBuffer.flush()
    @outputBuffer.appendToOutputBuffer(indentText + '});\n')

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
      @escapeJs(currentParsePoint.currentLine) + '"));\n')

  replaceReservedWordsInHash: (hash) ->
    resultHash = hash
    for reservedWord in ['class', 'for']
      resultHash = resultHash.replace(reservedWord + ':', '"' + reservedWord + '":')
    resultHash

  escapeJs: (jsStr) ->
    jsStr.replace(/"/g, '\\"')