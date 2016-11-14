###
  Common code shared across all code generators
###
class CodeGenerator

  embeddedCodeBlockMatcher: /#{([^}]*)}/g


  closeElements: (indent, elementStack, tokeniser, generator) ->
    i = elementStack.length - 1
    while i >= indent
      @closeElement(i--, elementStack, tokeniser, generator)

  closeElement: (indent, elementStack, tokeniser, generator) ->
    if elementStack[indent]
      generator.setIndent(indent)
      if elementStack[indent].htmlComment
        generator.outputBuffer.append(HamlRuntime.indentText(indent) + '-->' + elementStack[indent].eol)
      else if elementStack[indent].htmlConditionalComment
        generator.outputBuffer.append(HamlRuntime.indentText(indent) + '<![endif]-->' + elementStack[indent].eol)
      else if elementStack[indent].block
        generator.closeOffCodeBlock(tokeniser)
      else if elementStack[indent].fnBlock
        generator.closeOffFunctionBlock(tokeniser)
      else
        innerWhitespace = !elementStack[indent].tagOptions or elementStack[indent].tagOptions.innerWhitespace
        if innerWhitespace
          generator.outputBuffer.append(HamlRuntime.indentText(indent))
        else
          generator.outputBuffer.trimWhitespace()
        generator.outputBuffer.append('</' + elementStack[indent].tag + '>')
        outerWhitespace = !elementStack[indent].tagOptions or elementStack[indent].tagOptions.outerWhitespace
        generator.outputBuffer.append('\n') if haml._parentInnerWhitespace(elementStack, indent) and outerWhitespace
      elementStack[indent] = null
      generator.mark()

  openElement: (currentParsePoint, indent, identifier, id, classes, objectRef, attributeList, attributeHash, elementStack, tagOptions, generator) ->
    element = if identifier.length == 0 then "div" else identifier

    parentInnerWhitespace = haml._parentInnerWhitespace(elementStack, indent)
    tagOuterWhitespace = !tagOptions or tagOptions.outerWhitespace
    generator.outputBuffer.trimWhitespace() unless tagOuterWhitespace
    generator.outputBuffer.append(HamlRuntime.indentText(indent)) if indent > 0 and parentInnerWhitespace and tagOuterWhitespace
    generator.outputBuffer.append('<' + element)
    if attributeHash.length > 0 or objectRef.length > 0
      generator.generateCodeForDynamicAttributes(id, classes, attributeList, attributeHash, objectRef, currentParsePoint)
    else
      generator.outputBuffer.append(HamlRuntime.generateElementAttributes(null, id, classes, null, attributeList, null,
        currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine))
    if tagOptions.selfClosingTag
      generator.outputBuffer.append("/>")
      generator.outputBuffer.append("\n") if tagOptions.outerWhitespace
    else
      generator.outputBuffer.append(">")
      elementStack[indent] =
        tag: element
        tagOptions: tagOptions
      generator.outputBuffer.append("\n") if tagOptions.innerWhitespace
