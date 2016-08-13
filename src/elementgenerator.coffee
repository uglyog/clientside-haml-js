
if !Array.prototype.peek
  Array.prototype.peek = () ->
    @[@length - 1]


###
  Code generator that generates a Javascript function body
  to generate document elements.
###
class ElementGenerator extends CodeGenerator

  constructor: (@options) ->
    @outputBuffer = new haml.Buffer(this)


  ###
    Initilising the output buffer with any variables or code
  ###
  initOutput: () ->
    if @options?.tolerateFaults
      @outputBuffer.appendToOutputBuffer('  var handleError = haml.HamlRuntime._logError;')
    else
      @outputBuffer.appendToOutputBuffer('  var handleError = haml.HamlRuntime._raiseError;')

    @outputBuffer.appendToOutputBuffer(
      '''
          var hashFunction = null, hashObject = null, objRef = null, objRefFn = null, elm = null, parents = [];
          with (context || {}) {\n
      '''
    )

  ###
    Flush and close the output buffer and return the contents
  ###
  closeAndReturnOutput: () ->
    @outputBuffer.flush()
    ret = @outputBuffer.output() + '  }\n  return elm; '
    #console.log(ret)
    ret


  _indent: (indent) ->
    @outputBuffer.append(HamlRuntime.indentText(indent)) if indent > 0
    
  openElement: (currentParsePoint, indent, identifier, id, classes, objectRef, attributeList, attributeHash, elementStack, tagOptions, generator) ->
    element = if identifier.length == 0 then "div" else identifier
    parentInnerWhitespace = haml._parentInnerWhitespace(elementStack, indent)
    tagOuterWhitespace = !tagOptions or tagOptions.outerWhitespace
    @outputBuffer.trimWhitespace() unless tagOuterWhitespace


    @_indent(indent)
    @outputBuffer.append('elm = document.createElement("' + element + '");\n')
    @_indent(indent)
    @outputBuffer.append('if (parents.peek()) parents.peek().appendChild(elm);\n')
    @_indent(indent)
    @outputBuffer.append('parents.push(elm);\n')
    if id
      @_indent(indent)
      @outputBuffer.append('elm.setAttribute("id", "' + id + '");\n')
    if classes && classes.length > 0
      @_indent(indent)
      @outputBuffer.append('elm.setAttribute("class", "' + classes.join(' ') + '");\n')
    if attributeHash.length > 0
      @_indent(indent)
      @outputBuffer.append('hashFunction = eval("(' + attributeHash.replace(/"/g, '\\"').replace(/\n/g, '\\n') + ')");')
      @_indent(indent)
      @outputBuffer.append('for(var index in hashFunction) { if (hashFunction.hasOwnProperty(index)) { elm.setAttribute(index, hashFunction[index]);}}\n')

    elementStack[indent] = { element: element }

  closeElement: (indent, elementStack, tokeniser, generator) ->
    if elementStack[indent] && elementStack[indent].element
      @_indent(indent)
      @outputBuffer.append('elm = parents.pop();\n')
      elementStack[indent] = null
      generator.mark()

  ###
    Append a line with embedded javascript code
  ###
  appendEmbeddedCode: (indentText, expression, escapeContents, perserveWhitespace, currentParsePoint) ->
    @outputBuffer.flush()

    @outputBuffer.appendToOutputBuffer(indentText + 'try {\n')
    @outputBuffer.appendToOutputBuffer(indentText + '    var value = eval("' +
      (_.str || _).trim(expression).replace(/"/g, '\\"').replace(/\\n/g, '\\\\n') + '");\n')
    @outputBuffer.appendToOutputBuffer(indentText + '    elm.appendChild( (typeof value === "string") ? document.createTextNode(value) : value);\n')

    if false
      if escapeContents
        @outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.HamlRuntime.escapeHTML(String(value)));\n')
      else if perserveWhitespace
        @outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.HamlRuntime.perserveWhitespace(String(value)));\n')
      else
        @outputBuffer.appendToOutputBuffer(indentText + '    html.push(String(value));\n')

    @outputBuffer.appendToOutputBuffer(indentText + '} catch (e) {\n');
    @outputBuffer.appendToOutputBuffer(indentText + '  handleError(haml.HamlRuntime.templateError(' +
      currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
      @escapeCode(currentParsePoint.currentLine) + '",\n')
    @outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n')
    @outputBuffer.appendToOutputBuffer(indentText + '}\n')

  ###
    Append a line of code to the output buffer
  ###
  appendCodeLine: (line, eol) ->
    @outputBuffer.flush()
    @outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(@indent))
    @outputBuffer.appendToOutputBuffer(line)
    @outputBuffer.appendToOutputBuffer(eol)

  ###
    Does the current line end with a function declaration?
  ###
  lineMatchesStartFunctionBlock: (line) -> line.match(/function\s*\((,?\s*\w+)*\)\s*\{\s*$/)

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
    else
      @outputBuffer.appendToOutputBuffer('    hashFunction = null;\n')
    if objectRef.length > 0
      @outputBuffer.appendToOutputBuffer('    objRefFn = function () { return eval("objRef = ' +
        objectRef.replace(/"/g, '\\"') + '"); };\n')
    else
      @outputBuffer.appendToOutputBuffer('    objRefFn = null;\n');

    @outputBuffer.appendToOutputBuffer('    html.push(haml.HamlRuntime.generateElementAttributes(context, "' +
      id + '", ["' +
      classes.join('","') + '"], objRefFn, ' +
      JSON.stringify(attributeList) + ', hashFunction, ' +
      currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
      @escapeCode(currentParsePoint.currentLine) + '", handleError));\n')

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
    jsStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')

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
  generateFlush: (bufferStr) -> bufferStr #'    html.push("' + @escapeCode(bufferStr) + '");\n'

  ###
    Set the current indent level
  ###
  setIndent: (indent) -> @indent = indent

  ###
    Save the current indent level if required
  ###
  mark: () ->

  ###
    Append the text contents to the buffer, expanding any embedded code
  ###
  appendTextContents: (text, shouldInterpolate, currentParsePoint, options = {}) ->
    if shouldInterpolate and text.match(/#{[^}]*}/)
      @interpolateString(text, currentParsePoint, options)
    else
      #@outputBuffer.append(@processText(text, options))
      @outputBuffer.append('elm.appendChild(document.createTextNode("' + @processText(text, options) + '"));\n')

  ###
    Interpolate any embedded code in the text
  ###
  interpolateString: (text, currentParsePoint, options) ->
    index = 0
    result = @embeddedCodeBlockMatcher.exec(text)
    while result
      precheedingChar = text.charAt(result.index - 1) if result.index > 0
      precheedingChar2 = text.charAt(result.index - 2) if result.index > 1
      if precheedingChar is '\\' and precheedingChar2 isnt '\\'
        @outputBuffer.append(@processText(text.substring(index, result.index - 1), options)) unless result.index == 0
        @outputBuffer.append(@processText(result[0]), options)
      else
        @outputBuffer.append(@processText(text.substring(index, result.index)), options)
        @appendEmbeddedCode(HamlRuntime.indentText(@indent + 1), result[1], options.escapeHTML, options.perserveWhitespace, currentParsePoint)
      index = @embeddedCodeBlockMatcher.lastIndex
      result = @embeddedCodeBlockMatcher.exec(text)
    @outputBuffer.append(@processText(text.substring(index), options)) if index < text.length

  ###
    process text based on escape and preserve flags
  ###
  processText: (text, options) ->
    if options?.escapeHTML
      t = haml.HamlRuntime.escapeHTML(text)
    else if options?.perserveWhitespace
      t = haml.HamlRuntime.perserveWhitespace(text)
    else
      t = text
    t
    #@outputBuffer.append('elm.appendChild(document.createTextNode("' + t + '"));\n')
    
