###
  Haml runtime functions. These are used both by the compiler and the generated template functions
###
HamlRuntime =
  ###
    Taken from underscore.string.js escapeHTML, and replace the apos entity with character 39 so that it renders
    correctly in IE7
  ###
  escapeHTML: (str) ->
    String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, "&#39;")

  ###
    Provides the implementation to preserve the whitespace as per the HAML reference
  ###
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

  ###
    Generates a error message including the current line in the source where the error occurred
  ###
  templateError: (lineNumber, characterNumber, currentLine, error) ->
    message = error + " at line " + lineNumber + " and character " + characterNumber +
            ":\n" + currentLine + '\n'
    i = 0
    while i < characterNumber - 1
      message += '-'
      i++
    message += '^'
    message

  ###
    Generates the attributes for the element by combining all the various sources together
  ###
  generateElementAttributes: (context, id, classes, objRefFn, attrList, attrFunction, lineNumber, characterNumber, currentLine) ->
    attributes = {}

    attributes = @combineAttributes(attributes, 'id', id)
    if classes.length > 0 and classes[0].length > 0
      attributes = @combineAttributes(attributes, 'class', classes)

    if attrList?
      attributes = @combineAttributes(attributes, attr, value) for own attr, value of attrList

    if objRefFn?
      try
        object = objRefFn.call(context, context)
        if object?
          objectId = null
          if object.id?
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

    if attrFunction?
      try
        hash = attrFunction.call(context, context)
        if hash?
          hash = @_flattenHash(null, hash)
          attributes = @combineAttributes(attributes, attr, value) for own attr, value of hash
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

  ###
    Returns a white space string with a length of indent * 2
  ###
  indentText: (indent) ->
    text = ''
    i = 0
    while i < indent
      text += '  '
      i++
    text

  ###
    Combines the attributes in the attributres hash with the given attribute and value
    ID, FOR and CLASS attributes will expand to arrays when multiple values are provided
  ###
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

  ###
    Flattens a deeply nested hash into a single hash by combining the keys with a minus
  ###
  _flattenHash: (rootKey, object) ->
    result = {}
    if @_isHash(object)
      for own attr, value of object
        keys = []
        keys.push(rootKey) if rootKey?
        keys.push(attr)
        key = keys.join('-')
        flattenedValue = @_flattenHash(key, value)
        if @_isHash(flattenedValue)
          result[newKey] = newValue for own newKey, newValue of flattenedValue
        else
          result[key] = flattenedValue
    else if rootKey?
      result[rootKey] = object
    else
      result = object
    result

  _isHash: (object) ->
    object? and typeof object == 'object' and not (object instanceof Array or object instanceof Date)
