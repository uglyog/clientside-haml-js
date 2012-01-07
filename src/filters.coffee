###
  HAML filters are functions that take 3 parameters
    contents: The contents block for the filter an array of lines of text
    generator: The current generator for the compiled function
    indentText: A whitespace string specifying the current indent level
###

filters =
  ###
    Plain filter, just renders the text in the block
  ###
  plain: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + line + '\n') for line in contents
    true

  ###
    Wraps the filter block in a javascript tag
  ###
  javascript: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + "<script type=\"text/javascript\">\n")
    generator.outputBuffer.append(indentText + "//<![CDATA[\n")
    generator.outputBuffer.append(indentText + line + '\n') for line in contents
    generator.outputBuffer.append(indentText + "//]]>\n")
    generator.outputBuffer.append(indentText + "</script>\n")

  ###
    Wraps the filter block in a style tag
  ###
  css: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + "<style type=\"text/css\">\n")
    generator.outputBuffer.append(indentText + "/*<![CDATA[*/\n")
    generator.outputBuffer.append(indentText + line + '\n') for line in contents
    generator.outputBuffer.append(indentText + "/*]]>*/\n")
    generator.outputBuffer.append(indentText + "</style>\n")

  ###
    Wraps the filter block in a CDATA tag
  ###
  cdata: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + "<![CDATA[\n")
    generator.outputBuffer.append(indentText + line + '\n') for line in contents
    generator.outputBuffer.append(indentText + "]]>\n")

  ###
    Preserve filter, preserved blocks of text aren't indented, and newlines are replaced with the HTML escape code for newlines
  ###
  preserve: (contents, generator, indentText) ->
    generator.outputBuffer.append(haml.HamlRuntime.perserveWhitespace(contents.join('\n')) + '\n')

  ###
    Escape filter, renders the text in the block with html escaped
  ###
  escape: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + haml.HamlRuntime.escapeHTML(line) + '\n') for line in contents
    true