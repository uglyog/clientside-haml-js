###
  HAML filters are functions that take 3 parameters
    contents: The contents block for the filter
    generator: The current generator for the compiled function
    indentText: A whitespace string specifying the current indent level
###

filters =
  ###
    Plain filter, just renders the text in the block
  ###
  plain: (contents, generator, indentText) ->
    generator.outputBuffer.append(contents)

  ###
    Wraps the filter block in a javascript tag
  ###
  javascript: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + "<script type=\"text/javascript\">\\n")
    generator.outputBuffer.append(indentText + "//<![CDATA[\\n")
    generator.outputBuffer.append(contents + '\\n')
    generator.outputBuffer.append(indentText + "//]]>\\n")
    generator.outputBuffer.append(indentText + "</script>\\n")

  ###
    Wraps the filter block in a style tag
  ###
  css: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + "<style>\\n")
    generator.outputBuffer.append(indentText + "//<![CDATA[\\n")
    generator.outputBuffer.append(contents + '\\n')
    generator.outputBuffer.append(indentText + "//]]>\\n")
    generator.outputBuffer.append(indentText + "</style>\\n")

  ###
    Wraps the filter block in a CDATA tag
  ###
  cdata: (contents, generator, indentText) ->
    generator.outputBuffer.append(indentText + "<![CDATA[\\n")
    generator.outputBuffer.append(contents + '\\n')
    generator.outputBuffer.append(indentText + "]]>\\n")