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