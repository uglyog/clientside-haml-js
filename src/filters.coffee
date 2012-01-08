###
  HAML filters are functions that take 3 parameters
    contents: The contents block for the filter an array of lines of text
    generator: The current generator for the compiled function
    indentText: A whitespace string specifying the current indent level
    currentParsePoint: line and character counters for the current parse point in the input buffer
###

filters =
  ###
    Plain filter, just renders the text in the block
  ###
  plain: (contents, generator, indentText, currentParsePoint) ->
    generator.appendTextContents(indentText + line + '\n', true, currentParsePoint) for line in contents
    true

  ###
    Wraps the filter block in a javascript tag
  ###
  javascript: (contents, generator, indentText, currentParsePoint) ->
    generator.outputBuffer.append(indentText + "<script type=\"text/javascript\">\n")
    generator.outputBuffer.append(indentText + "//<![CDATA[\n")
    generator.appendTextContents(indentText + line + '\n', true, currentParsePoint) for line in contents
    generator.outputBuffer.append(indentText + "//]]>\n")
    generator.outputBuffer.append(indentText + "</script>\n")

  ###
    Wraps the filter block in a style tag
  ###
  css: (contents, generator, indentText, currentParsePoint) ->
    generator.outputBuffer.append(indentText + "<style type=\"text/css\">\n")
    generator.outputBuffer.append(indentText + "/*<![CDATA[*/\n")
    generator.appendTextContents(indentText + line + '\n', true, currentParsePoint) for line in contents
    generator.outputBuffer.append(indentText + "/*]]>*/\n")
    generator.outputBuffer.append(indentText + "</style>\n")

  ###
    Wraps the filter block in a CDATA tag
  ###
  cdata: (contents, generator, indentText, currentParsePoint) ->
    generator.outputBuffer.append(indentText + "<![CDATA[\n")
    generator.appendTextContents(indentText + line + '\n', true, currentParsePoint) for line in contents
    generator.outputBuffer.append(indentText + "]]>\n")

  ###
    Preserve filter, preserved blocks of text aren't indented, and newlines are replaced with the HTML escape code for newlines
  ###
  preserve: (contents, generator, indentText, currentParsePoint) ->
    generator.appendTextContents(contents.join('\n') + '\n', true, currentParsePoint, perserveWhitespace: true)

  ###
    Escape filter, renders the text in the block with html escaped
  ###
  escape: (contents, generator, indentText, currentParsePoint) ->
    generator.appendTextContents(indentText + line + '\n', true, currentParsePoint, escapeHTML: true) for line in contents
    true