HamlRuntime =
  # taken from underscore.string.js escapeHTML
  escapeHTML: (str) ->
    String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, "&#39;")

  perserveWhitespace: (str) ->
    re = /<[a-zA-Z]+>[^<]*<\/[a-zA-Z]+>/g
    out = ''
    i = 0
    result = re.exec(str)
    if result
      while result
        out += str.substring(i, result.index)
        out += result[0].replace(/\n/g, '&#x000A;')
        i = result.index + result[0].length
        result = re.exec(str)
      out += str.substring(i)
    else
      out = str
    out

  templateError: (lineNumber, characterNumber, currentLine, error) ->
    message = error + " at line " + lineNumber + " and character " + characterNumber +
            ":\n" + currentLine + '\n'
    i = 0
    while i < characterNumber - 1
      message += '-'
      i++
    message += '^'
    message

  generateElementAttributes: (context, id, classes, objRefFn, attrList, attrFunction, lineNumber, characterNumber, currentLine) ->
    attributes = {}

    attributes = haml.combineAttributes(attributes, 'id', id)
    if classes.length > 0 and classes[0].length > 0
      attributes = haml.combineAttributes(attributes, 'class', classes)

    if attrList
      for own attr of attrList
        attributes = haml.combineAttributes(attributes, attr, attrList[attr])

    if objRefFn
      try
        object = objRefFn.call(context, context)
        if object
          objectId = null
          if object.id
            objectId = object.id
          else if object.get
            objectId = object.get('id')
          attributes = haml.combineAttributes(attributes, 'id', objectId)
          className = null
          if object['class']
            className = object['class']
          else if object.get
            className = object.get('class')
          attributes = haml.combineAttributes(attributes, 'class', className)
      catch e
        throw haml.HamlRuntime.templateError(lineNumber, characterNumber, currentLine, "Error evaluating object reference - #{e}")

    if attrFunction
      try
        hash = attrFunction.call(context, context)
        if hash
          for own attr of hash
            if attr == 'data'
              dataAttributes = hash[attr]
              for own dataAttr of dataAttributes
                attributes = haml.combineAttributes(attributes, 'data-' + dataAttr, dataAttributes[dataAttr])
            else
              attributes = haml.combineAttributes(attributes, attr, hash[attr])
      catch ex
        throw haml.HamlRuntime.templateError(lineNumber, characterNumber, currentLine, "Error evaluating attribute hash - #{ex}")

    html = ''
    if attributes
      for own attr of attributes
        if haml.hasValue(attributes[attr])
          if (attr == 'id' or attr == 'for') and attributes[attr] instanceof Array
            html += ' ' + attr + '="' + _(attributes[attr]).flatten().join('-') + '"'
          else if attr == 'class' and attributes[attr] instanceof Array
            html += ' ' + attr + '="' + _(attributes[attr]).flatten().join(' ') + '"'
          else
            html += ' ' + attr + '="' + haml.attrValue(attr, attributes[attr]) + '"'
    html

  indentText: (indent) ->
    text = ''
    i = 0
    while i < indent
      text += '  '
      i++
    text