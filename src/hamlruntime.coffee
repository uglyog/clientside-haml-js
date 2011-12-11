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

    attributes = @combineAttributes(attributes, 'id', id)
    if classes.length > 0 and classes[0].length > 0
      attributes = @combineAttributes(attributes, 'class', classes)

    if attrList
      for own attr of attrList
        attributes = @combineAttributes(attributes, attr, attrList[attr])

    if objRefFn
      try
        object = objRefFn.call(context, context)
        if object
          objectId = null
          if object.id
            objectId = object.id
          else if object.get
            objectId = object.get('id')
          attributes = @combineAttributes(attributes, 'id', objectId)
          className = null
          if object['class']
            className = object['class']
          else if object.get
            className = object.get('class')
          attributes = @combineAttributes(attributes, 'class', className)
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
                attributes = @combineAttributes(attributes, 'data-' + dataAttr, dataAttributes[dataAttr])
            else
              attributes = @combineAttributes(attributes, attr, hash[attr])
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

  combineAttributes: (attributes, attrName, attrValue) ->
    if haml.hasValue(attrValue)
      if attrName == 'id' and attrValue.toString().length > 0
        if attributes and attributes.id instanceof Array
          attributes.id.unshift(attrValue)
        else if attributes and attributes.id
          attributes.id = [attributes.id, attrValue]
        else if attributes
          attributes.id = attrValue
        else
          attributes = id: attrValue
      else if attrName == 'for' and attrValue.toString().length > 0
        if attributes and attributes['for'] instanceof Array
          attributes['for'].unshift attrValue
        else if attributes and attributes['for']
          attributes['for'] = [attributes['for'], attrValue]
        else if attributes
          attributes['for'] = attrValue
        else
          attributes = 'for': attrValue
      else if attrName == 'class'
        classes = []
        if attrValue instanceof Array
          classes = classes.concat(attrValue)
        else
          classes.push(attrValue)
        if attributes and attributes['class']
          attributes['class'] = attributes['class'].concat(classes)
        else if attributes
          attributes['class'] = classes
        else
          attributes = 'class': classes
      else if attrName isnt 'id'
        attributes ||= {}
        attributes[attrName] = attrValue
    attributes