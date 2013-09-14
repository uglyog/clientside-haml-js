###
  HAML filters are functions that take 3 parameters
    contents: The contents block for the filter an array of lines of text
    generator: The current generator for the compiled function
    indent: The current indent level
    currentParsePoint: line and character counters for the current parse point in the input buffer
###

filters =
  ###
    Plain filter, just renders the text in the block
  ###
  plain: (contents, generator, indent, currentParsePoint) ->
    generator.appendTextContents(haml.HamlRuntime.indentText(indent - 1) + line + '\n', true, currentParsePoint) for line in contents
    true

  ###
    Wraps the filter block in a javascript tag
  ###
  javascript: (contents, generator, indent, currentParsePoint) ->
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent) + "<script type=\"text/javascript\">\n")
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent + 1) + "//<![CDATA[\n")
    generator.appendTextContents(haml.HamlRuntime.indentText(indent + 1) + line + '\n', true, currentParsePoint) for line in contents
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent + 1) + "//]]>\n")
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent) + "</script>\n")

  ###
    Wraps the filter block in a style tag
  ###
  css: (contents, generator, indent, currentParsePoint) ->
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent) + "<style type=\"text/css\">\n")
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent + 1) + "/*<![CDATA[*/\n")
    generator.appendTextContents(haml.HamlRuntime.indentText(indent + 1) + line + '\n', true, currentParsePoint) for line in contents
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent + 1) + "/*]]>*/\n")
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent) + "</style>\n")

  ###
    Wraps the filter block in a CDATA tag
  ###
  cdata: (contents, generator, indent, currentParsePoint) ->
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent) + "<![CDATA[\n")
    generator.appendTextContents(haml.HamlRuntime.indentText(indent) + line + '\n', true, currentParsePoint) for line in contents
    generator.outputBuffer.append(haml.HamlRuntime.indentText(indent) + "]]>\n")

  ###
    Preserve filter, preserved blocks of text aren't indented, and newlines are replaced with the HTML escape code for newlines
  ###
  preserve: (contents, generator, indent, currentParsePoint) ->
    generator.appendTextContents(haml.HamlRuntime.indentText(indent), false, currentParsePoint)
    generator.appendTextContents((haml.HamlRuntime.trim(line, 2) for line in contents).join('&#x000A; ') + '\n', true, currentParsePoint)

  ###
    Escape filter, renders the text in the block with html escaped
  ###
  escaped: (contents, generator, indent, currentParsePoint) ->
    generator.appendTextContents(haml.HamlRuntime.indentText(indent - 1) + line + '\n', true, currentParsePoint, escapeHTML: true) for line in contents
    true
