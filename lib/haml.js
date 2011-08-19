/*jslint plusplus: false, evil: true, regexp: false */

var root = this;

root.haml = {

  compileHaml: function (templateId) {
    if (haml.cache && haml.cache[templateId]) {
      return haml.cache[templateId];
    }

    var result = this.compileHamlToJs(new haml.Tokeniser({templateId: templateId}));
    var fn = null;

    try {
      fn = new Function('context', result);
    } catch (e) {
      throw "Incorrect embedded JS code has resulted in an invalid Haml function - " + e + "\nGenerated Function:\n" +
        result;
    }

    if (!haml.cache) {
      haml.cache = {};
    }
    haml.cache[templateId] = fn;

    return fn;
  },

  compileHamlToJs: function (tokeniser)
  {
    var outputBuffer = new haml.Buffer();
    var elementStack = [];

    var result = '  var html = [];\n';
    result += '  var hashFunction = null, hashObject = null, objRef = null, objRefFn = null;\n  with (context) {\n';

    // HAML -> WS* (
    //          TEMPLATELINE
    //          | IGNOREDLINE
    //          | EMBEDDEDJS
    //          | JSCODE
    //          | COMMENTLINE
    //         )* EOF
    tokeniser.getNextToken();
    while (!tokeniser.token.eof)
    {
      if (!tokeniser.token.eol)
      {
        var indent = haml.whitespace(tokeniser);
        if (tokeniser.token.exclamation)
        {
          haml.ignoredLine(tokeniser, indent, elementStack, outputBuffer);
        } else if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml ||
          tokeniser.token.tilde) {
          haml.embeddedJs(tokeniser, indent, elementStack, outputBuffer, {innerWhitespace: true});
        } else if (tokeniser.token.minus) {
          haml.jsLine(tokeniser, indent, elementStack, outputBuffer);
        } else if (tokeniser.token.comment || tokeniser.token.slash) {
          haml.commentLine(tokeniser, indent, elementStack, outputBuffer);
        } else if (tokeniser.token.amp) {
          haml.escapedLine(tokeniser, indent, elementStack, outputBuffer);
        } else {
          haml.templateLine(tokeniser, elementStack, outputBuffer, indent);
        }
      } else {
        tokeniser.getNextToken();
      }
    }

    haml.closeElements(0, elementStack, outputBuffer, tokeniser);
    outputBuffer.flush();
    result += outputBuffer.output();

    result += '  }\n  return html.join("");\n';
    return result;
  },

  commentLine: function (tokeniser, indent, elementStack, outputBuffer) {
    if (tokeniser.token.comment) {
      tokeniser.skipToEOLorEOF();
    } else if (tokeniser.token.slash) {
      haml.closeElements(indent, elementStack, outputBuffer, tokeniser);
      outputBuffer.append(haml.indentText(indent));
      outputBuffer.append("<!--");
      var contents = tokeniser.skipToEOLorEOF();
      if (contents && contents.length > 0) {
        outputBuffer.append(contents);
      }

      if (contents && _(contents).startsWith('[') && contents.match(/\]\s*$/)) {
        elementStack[indent] = { htmlConditionalComment: true };
        outputBuffer.append(">");
      } else {
        elementStack[indent] = { htmlComment: true };
      }

      if (haml.tagHasContents(indent, tokeniser)) {
        outputBuffer.append("\\n");
      }
    }
  },

  escapedLine: function (tokeniser, indent, elementStack, outputBuffer) {
    if (tokeniser.token.amp) {
      haml.closeElements(indent, elementStack, outputBuffer, tokeniser);
      outputBuffer.append(haml.indentText(indent));
      var contents = tokeniser.skipToEOLorEOF();
      if (contents && contents.length > 0) {
        outputBuffer.append(_(contents).escapeHTML());
      }
      outputBuffer.append("\\n");
    }
  },


  ignoredLine: function (tokeniser, indent, elementStack, outputBuffer) {
    if (tokeniser.token.exclamation) {
      tokeniser.getNextToken();
      if (tokeniser.token.ws) {
        indent += haml.whitespace(tokeniser);
      }
      tokeniser.pushBackToken();
      haml.closeElements(indent, elementStack, outputBuffer, tokeniser);
      var contents = tokeniser.skipToEOLorEOF();
      outputBuffer.append(haml.indentText(indent) + contents + '\\n');
    }
  },

  embeddedJs: function (tokeniser, indent, elementStack, outputBuffer, tagOptions) {
    if (elementStack) {
      haml.closeElements(indent, elementStack, outputBuffer, tokeniser);
    }
    if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml || tokeniser.token.tilde) {
      var escapeHtml = tokeniser.token.escapeHtml || tokeniser.token.equal;
      var perserveWhitespace = tokeniser.token.tilde;
      var currentParsePoint = tokeniser.currentParsePoint();
      var expression = tokeniser.skipToEOLorEOF();
      var indentText = haml.indentText(indent);
      if (!tagOptions || tagOptions.innerWhitespace) {
        outputBuffer.append(indentText);
      }
      outputBuffer.flush();

      outputBuffer.appendToOutputBuffer(indentText + 'try {\n');
      outputBuffer.appendToOutputBuffer(indentText + '    var value = eval("' +
        expression.replace(/"/g, '\\"').replace(/\\n/g, '\\\\n') + '");\n');
      outputBuffer.appendToOutputBuffer(indentText + '    value = value === null ? "" : value;');
      if (escapeHtml) {
        outputBuffer.appendToOutputBuffer(indentText + '    html.push(_(String(value)).escapeHTML());\n');
      } else if (perserveWhitespace) {
        outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.perserveWhitespace(String(value)));\n');
      } else {
        outputBuffer.appendToOutputBuffer(indentText + '    html.push(String(value));\n');
      }
      outputBuffer.appendToOutputBuffer(indentText + '} catch (e) {\n');
      outputBuffer.appendToOutputBuffer(indentText + '  throw new Error(haml.templateError(' +
              currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
              haml.escapeJs(currentParsePoint.currentLine) + '",\n');
      outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n');
      outputBuffer.appendToOutputBuffer(indentText + '}\n');

      if (!tagOptions || tagOptions.innerWhitespace) {
        outputBuffer.append("\\n");
      }
    }
  },

  jsLine: function (tokeniser, indent, elementStack, outputBuffer) {
    if (tokeniser.token.minus) {
      haml.closeElements(indent, elementStack, outputBuffer, tokeniser);
      outputBuffer.flush();
      outputBuffer.appendToOutputBuffer(haml.indentText(indent));
      var line = tokeniser.skipToEOLorEOF();
      outputBuffer.appendToOutputBuffer(line);
      outputBuffer.appendToOutputBuffer('\n');

      if (line.match(/function\s\((,?\s*\w+)*\)\s*\{\s*$/)) {
        elementStack[indent] = { fnBlock: true };
      } else if (line.match(/\{\s*$/)) {
        elementStack[indent] = { block: true };
      }
    }
  },

  // TEMPLATELINE -> ([ELEMENT][IDSELECTOR][CLASSSELECTORS][ATTRIBUTES] [SLASH|CONTENTS])|(!CONTENTS) (EOL|EOF)
  templateLine: function (tokeniser, elementStack, outputBuffer, indent) {
    if (!tokeniser.token.eol) {
      haml.closeElements(indent, elementStack, outputBuffer, tokeniser);
    }

    var ident = haml.element(tokeniser);
    var id = haml.idSelector(tokeniser);
    var classes = haml.classSelector(tokeniser);
    var objectRef = haml.objectReference(tokeniser);
    var attrList = haml.attributeList(tokeniser);

    var currentParsePoint = tokeniser.currentParsePoint();
    var attributesHash = haml.attributeHash(tokeniser);

    var tagOptions = {
      selfClosingTag: false,
      innerWhitespace: true,
      outerWhitespace: true
    };
    if (tokeniser.token.slash) {
      tagOptions.selfClosingTag = true;
      tokeniser.getNextToken();
    }
    if (tokeniser.token.gt && haml.lineHasElement(ident, id, classes)) {
      tagOptions.outerWhitespace = false;
      tokeniser.getNextToken();
    }
    if (tokeniser.token.lt && haml.lineHasElement(ident, id, classes)) {
      tagOptions.innerWhitespace = false;
      tokeniser.getNextToken();
    }

    if (haml.lineHasElement(ident, id, classes)) {
      if (!tagOptions.selfClosingTag) {
        tagOptions.selfClosingTag = haml.isSelfClosingTag(ident) && !haml.tagHasContents(indent, tokeniser);
      }
      haml.openElement(currentParsePoint, indent, ident, id, classes, objectRef, attrList, attributesHash, elementStack,
        outputBuffer, tagOptions);
    } else if (!haml.isEolOrEof(tokeniser) && !tokeniser.token.ws) {
      tokeniser.pushBackToken();
    }

    var contents = haml.elementContents(tokeniser, indent + 1, outputBuffer, tagOptions);
    haml.eolOrEof(tokeniser);

    if (tagOptions.selfClosingTag && contents.length > 0) {
      throw haml.templateError(currentParsePoint.lineNumber, currentParsePoint.characterNumber,
              currentParsePoint.currentLine, "A self-closing tag can not have any contents");
    }
    else if (contents.length > 0) {
      if (contents.match(/^\\%/)) {
        contents = contents.substring(1);
      }
      if (tagOptions.innerWhitespace && haml.lineHasElement(ident, id, classes) ||
        (!haml.lineHasElement(ident, id, classes) && haml.parentInnerWhitespace(elementStack, indent))) {
        var i = indent;
        if (ident.length > 0) {
          i += 1;
        }
        outputBuffer.append(haml.indentText(i) + contents + '\\n');
      } else {
        outputBuffer.append(_(contents).trim() + '\\n');
      }
    } else if (!haml.lineHasElement(ident, id, classes) && tagOptions.innerWhitespace) {
      outputBuffer.append(haml.indentText(indent) + '\\n');
    }
  },

  elementContents: function (tokeniser, indent, outputBuffer, tagOptions) {
    var contents = '';

    if (!tokeniser.token.eof) {
      if (tokeniser.token.ws) {
        tokeniser.getNextToken();
      }

      if (tokeniser.token.exclamation) {
        contents = tokeniser.skipToEOLorEOF();
      } else if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml) {
        haml.embeddedJs(tokeniser, indent, null, outputBuffer, tagOptions);
      } else if (!tokeniser.token.eol) {
        tokeniser.pushBackToken();
        contents = tokeniser.skipToEOLorEOF();
      }
    }

    return contents;
  },

  attributeHash: function (tokeniser) {
    var attr = '';
    if (tokeniser.token.attributeHash) {
      attr = tokeniser.token.tokenString;
      tokeniser.getNextToken();
    }
    return attr;
  },

  objectReference: function (tokeniser) {
    var attr = '';
    if (tokeniser.token.objectReference) {
      attr = tokeniser.token.tokenString;
      tokeniser.getNextToken();
    }
    return attr;
  },

  // ATTRIBUTES -> ( ATTRIBUTE* )
  attributeList: function (tokeniser) {
    var attrList = {};
    if (tokeniser.token.openBracket) {
      tokeniser.getNextToken();
      while (!tokeniser.token.closeBracket) {
        var attr = haml.attribute(tokeniser);
        if (attr) {
          attrList[attr.name] = attr.value;
        } else {
          tokeniser.getNextToken();
        }
        if (tokeniser.token.ws || tokeniser.token.eol) {
          tokeniser.getNextToken();
        } else if (!tokeniser.token.closeBracket && !tokeniser.token.identifier) {
          throw tokeniser.parseError("Expecting either an attribute name to continue the attibutes or a closing " +
            "bracket to end");
        }
      }
      tokeniser.getNextToken();
    }
    return attrList;
  },

  // ATTRIBUTE -> IDENTIFIER WS* = WS* STRING
  attribute: function (tokeniser) {
    var attr = null;

    if (tokeniser.token.identifier) {
      var name = tokeniser.token.tokenString;
      tokeniser.getNextToken();
      haml.whitespace(tokeniser);
      if (!tokeniser.token.equal) {
        throw tokeniser.parseError("Expected '=' after attribute name");
      }
      tokeniser.getNextToken();
      haml.whitespace(tokeniser);
      if (!tokeniser.token.string && !tokeniser.token.identifier) {
        throw tokeniser.parseError("Expected a quoted string or an identifier for the attribute value");
      }
      attr = {name: name, value: tokeniser.token.tokenString};
      tokeniser.getNextToken();
    }

    return attr;
  },

  closeElement: function (indent, elementStack, outputBuffer, tokeniser) {
    if (elementStack[indent]) {
      if (elementStack[indent].htmlComment) {
        outputBuffer.append(haml.indentText(indent) + '-->\\n');
      } else if (elementStack[indent].htmlConditionalComment) {
        outputBuffer.append(haml.indentText(indent) + '<![endif]-->\\n');
      } else if (elementStack[indent].block) {
        if (!tokeniser.token.minus || !tokeniser.matchToken(/\s*\}/g)) {
          outputBuffer.flush();
          outputBuffer.appendToOutputBuffer(haml.indentText(indent) + '}\n');
        }
      } else if (elementStack[indent].fnBlock) {
        if (!tokeniser.token.minus || !tokeniser.matchToken(/\s*\}/g)) {
          outputBuffer.flush();
          outputBuffer.appendToOutputBuffer(haml.indentText(indent) + '});\n');
        }
      } else {
        var innerWhitespace = !elementStack[indent].tagOptions || elementStack[indent].tagOptions.innerWhitespace;
        if (innerWhitespace) {
          outputBuffer.append(haml.indentText(indent));
        } else {
          outputBuffer.trimWhitespace();
        }
        outputBuffer.append('</' + elementStack[indent].tag + '>');
        var outerWhitespace = !elementStack[indent].tagOptions || elementStack[indent].tagOptions.outerWhitespace;
        if (haml.parentInnerWhitespace(elementStack, indent) && outerWhitespace) {
          outputBuffer.append('\\n');
        }
      }
      elementStack[indent] = null;
    }
  },

  closeElements: function (indent, elementStack, outputBuffer, tokeniser) {
    for (var i = elementStack.length - 1; i >= indent; (i--)) {
      haml.closeElement(i, elementStack, outputBuffer, tokeniser);
    }
  },

  openElement: function (currentParsePoint,
                         indent,
                         ident,
                         id,
                         classes,
                         objectRef,
                         attributeList,
                         attributeHash,
                         elementStack,
                         outputBuffer,
                         tagOptions) {
    var element = ident;
    if (element.length === 0) {
      element = 'div';
    }

    var parentInnerWhitespace = haml.parentInnerWhitespace(elementStack, indent);
    var tagOuterWhitespace = !tagOptions || tagOptions.outerWhitespace;
    if (!tagOuterWhitespace) {
      outputBuffer.trimWhitespace();
    }
    if (indent > 0 && parentInnerWhitespace && tagOuterWhitespace) {
      outputBuffer.append(haml.indentText(indent));
    }
    outputBuffer.append('<' + element);
    if (attributeHash.length > 0 || objectRef.length > 0) {
      outputBuffer.flush();
      if (attributeHash.length > 0) {
        attributeHash = this.replaceReservedWordsInHash(attributeHash);
        outputBuffer.appendToOutputBuffer('    hashFunction = function () { return eval("hashObject = ' +
          attributeHash.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"); };\n');
      }
      if (objectRef.length > 0) {
        outputBuffer.appendToOutputBuffer('    objRefFn = function () { return eval("objRef = ' +
          objectRef.replace(/"/g, '\\"') + '"); };\n');
      }

      outputBuffer.appendToOutputBuffer('    html.push(haml.generateElementAttributes(context, "' +
              id + '", ["' +
              classes.join('","') + '"], objRefFn, ' +
              JSON.stringify(attributeList) + ', hashFunction, ' +
              currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
              haml.escapeJs(currentParsePoint.currentLine) + '"));\n');
    } else {
      outputBuffer.append(haml.generateElementAttributes(null, id, classes, null, attributeList, null,
              currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine));
    }
    if (tagOptions.selfClosingTag) {
      outputBuffer.append("/>");
      if (tagOptions.outerWhitespace) {
        outputBuffer.append("\\n");
      }
    } else {
      outputBuffer.append(">");
      elementStack[indent] = { tag: element, tagOptions: tagOptions };
      if (tagOptions.innerWhitespace) {
        outputBuffer.append("\\n");
      }
    }
  },

  replaceReservedWordsInHash: function (hash) {
    var resultHash;

    resultHash = hash;
    _(['class', 'for']).each(function (reservedWord) {
      resultHash = resultHash.replace(reservedWord + ':', '"' + reservedWord + '":');
    });

    return resultHash;
  },

  escapeJs: function (jsStr) {
    return jsStr.replace(/"/g, '\\"');
  },

  combineAttributes: function (attributes, attrName, attrValue) {
    if (attrValue) {
      if (attrName === 'id' && attrValue.toString().length > 0) {
        if (attributes && attributes.id instanceof Array) {
          attributes.id.unshift(attrValue);
        } else if (attributes && attributes.id) {
          attributes.id = [attributes.id, attrValue];
        } else if (attributes) {
          attributes.id = attrValue;
        } else {
          attributes = {id: attrValue};
        }
      }
      else if (attrName === 'for' && attrValue.toString().length > 0) {
        if (attributes && attributes['for'] instanceof Array) {
          attributes['for'].unshift(attrValue);
        } else if (attributes && attributes['for']) {
          attributes['for'] = [attributes['for'], attrValue];
        } else if (attributes) {
          attributes['for'] = attrValue;
        } else {
          attributes = {'for': attrValue};
        }
      } else if (attrName === 'class') {
        var classes = [];
        if (attrValue instanceof Array) {
          classes = classes.concat(attrValue);
        } else {
          classes.push(attrValue);
        }
        if (attributes && attributes['class']) {
          attributes['class'] = attributes['class'].concat(classes);
        } else if (attributes) {
          attributes['class'] = classes;
        } else {
          attributes = {'class': classes};
        }
      } else if (attrName !== 'id') {
        if (!attributes) {
          attributes = {};
        }
        attributes[attrName] = attrValue;
      }
    }
    return attributes;
  },

  isSelfClosingTag: function (tag) {
    return _(['meta', 'img', 'link', 'script', 'br', 'hr']).contains(tag);
  },

  tagHasContents: function (indent, tokeniser) {
    if (!haml.isEolOrEof(tokeniser)) {
      return true;
    } else {
      var nextToken = tokeniser.lookAhead(1);
      return nextToken.ws && nextToken.tokenString.length / 2 > indent;
    }
  },

  parentInnerWhitespace: function (elementStack, indent)
  {
    return indent === 0 || (!elementStack[indent - 1] || !elementStack[indent - 1].tagOptions ||
      elementStack[indent - 1].tagOptions.innerWhitespace);
  },

  lineHasElement: function (ident, id, classes)
  {
    return ident.length > 0 || id.length > 0 || classes.length > 0;
  },

  generateElementAttributes: function (context,
                                       id,
                                       classes,
                                       objRefFn,
                                       attrList,
                                       attrFunction,
                                       lineNumber,
                                       characterNumber,
                                       currentLine) {
    var attributes = {};

    attributes = haml.combineAttributes(attributes, 'id', id);
    if (classes.length > 0 && classes[0].length > 0) {
      attributes = haml.combineAttributes(attributes, 'class', classes);
    }

    var attr;
    if (attrList) {
      for (attr in attrList) {
        if (attrList.hasOwnProperty(attr)) {
          attributes = haml.combineAttributes(attributes, attr, attrList[attr]);
        }
      }
    }

    if (objRefFn) {
      try {
        var object = objRefFn.call(this, context);
        if (object) {
          var objectId = null;
          if (object.id) {
            objectId = object.id;
          } else if (object.get) {
            objectId = object.get('id');
          }
          attributes = haml.combineAttributes(attributes, 'id', objectId);
          var className = null;
          if (object['class']) {
            className = object['class'];
          } else if (object.get) {
            className = object.get('class');
          }
          attributes = haml.combineAttributes(attributes, 'class', className);
        }
      } catch (e) {
        throw haml.templateError(lineNumber, characterNumber, currentLine, "Error evaluating object reference - " + e);
      }
    }

    if (attrFunction) {
      try {
        var hash = attrFunction.call(this, context);
        if (hash) {
          for (attr in hash) {
            if (hash.hasOwnProperty(attr)) {
              if (attr === 'data') {
                var dataAttributes = hash[attr];
                for (var dataAttr in dataAttributes) {
                  if (dataAttributes.hasOwnProperty(dataAttr)) {
                    attributes = haml.combineAttributes(attributes, 'data-' + dataAttr, dataAttributes[dataAttr]);
                  }
                }
              } else {
                attributes = haml.combineAttributes(attributes, attr, hash[attr]);
              }
            }
          }
        }
      } catch (ex) {
        throw haml.templateError(lineNumber, characterNumber, currentLine, "Error evaluating attribute hash - " + ex);
      }
    }

    var html = '';
    if (attributes) {
      for (attr in attributes) {
        if (attributes.hasOwnProperty(attr) && attributes[attr]) {
          if ((attr === 'id' || attr === 'for') && attributes[attr] instanceof Array) {
            html += ' ' + attr + '="' + _(attributes[attr]).flatten().join('-') + '"';
          } else if (attr === 'class' && attributes[attr] instanceof Array) {
            html += ' ' + attr + '="' + _(attributes[attr]).flatten().join(' ') + '"';
          } else {
            html += ' ' + attr + '="' + haml.attrValue(attr, attributes[attr]) + '"';
          }
        }
      }
    }
    return html;
  },

  attrValue: function (attr, value) {
    if (_(['selected', 'checked', 'disabled']).contains(attr)) {
      return attr;
    } else {
      return value;
    }
  },

  indentText: function (indent) {
    var text = '';
    for (var i = 0; i < indent; i++) {
      text += '  ';
    }
    return text;
  },

  whitespace: function (tokeniser) {
    var indent = 0;
    if (tokeniser.token.ws) {
      indent = tokeniser.token.tokenString.length / 2;
      tokeniser.getNextToken();
    }
    return indent;
  },

  element: function (tokeniser) {
    var ident = '';
    if (tokeniser.token.element) {
      ident = tokeniser.token.tokenString;
      tokeniser.getNextToken();
    }
    return ident;
  },

  eolOrEof: function (tokeniser) {
    if (tokeniser.token.eol) {
      tokeniser.getNextToken();
    } else if (!tokeniser.token.eof) {
      throw tokeniser.parseError("Expected EOL or EOF");
    }
  },

  // IDSELECTOR = # ID
  idSelector: function (tokeniser) {
    var id = '';
    if (tokeniser.token.idSelector) {
      id = tokeniser.token.tokenString;
      tokeniser.getNextToken();
    }
    return id;
  },

  // CLASSSELECTOR = (.CLASS)+
  classSelector: function (tokeniser) {
    var classes = [];

    while (tokeniser.token.classSelector) {
      classes.push(tokeniser.token.tokenString);
      tokeniser.getNextToken();
    }

    return classes;
  },

  templateError: function (lineNumber, characterNumber, currentLine, error) {
    var message = error + " at line " + lineNumber + " and character " + characterNumber +
            ":\n" + currentLine + '\n';
    for (var i = 0; i < characterNumber - 1; i++) {
      message += '-';
    }
    message += '^';
    return message;
  },

  isEolOrEof: function (tokeniser) {
    return tokeniser.token.eol || tokeniser.token.eof;
  },

  perserveWhitespace: function (str) {
    var re = /<[a-zA-Z]+>[^<]*<\/[a-zA-Z]+>/g;
    var out = '';
    var i = 0;
    var result = re.exec(str);
    if (result) {
      while (result) {
        out += str.substring(i, result.index);
        out += result[0].replace(/\n/g, '&#x000A;');
        i = result.index + result[0].length;
        result = re.exec(str);
      }
      out += str.substring(i);
    } else {
      out = str;
    }
    return out;
  },

  Tokeniser: function (options) {
    this.buffer = null;
    this.bufferIndex = null;
    this.prevToken = null;
    this.token = null;

    if (options.templateId) {
      var template = document.getElementById(options.templateId);
      if (template) {
        this.buffer = template.innerHTML;
        this.bufferIndex = 0;
      } else {
        throw "Did not find a template with ID '" + options.templateId + "'";
      }
    } else if (options.template) {
      this.buffer = options.template;
      this.bufferIndex = 0;
    }

    this.tokenMatchers = {
      whitespace:       /[ \t]+/g,
      element:          /%[a-zA-Z][a-zA-Z0-9]*/g,
      idSelector:       /#[a-zA-Z_\-][a-zA-Z0-9_\-]*/g,
      classSelector:    /\.[a-zA-Z0-9_\-]+/g,
      identifier:       /[a-zA-Z][a-zA-Z0-9\-]*/g,
      quotedString:     /[\'][^\'\n]*[\']/g,
      quotedString2:    /[\"][^\"\n]*[\"]/g,
      comment:          /\-#/g,
      escapeHtml:       /\&=/g,
      unescapeHtml:     /\!=/g,
      objectReference:  /\[[a-zA-Z_][a-zA-Z0-9_]*\]/g
    };

    this.matchToken = function (matcher) {
      matcher.lastIndex = this.bufferIndex;
      var result = matcher.exec(this.buffer);
      if (result && result.index === this.bufferIndex) {
        return result[0];
      }
      return null;
    };

    this.getNextToken = function () {

      if (isNaN(this.bufferIndex)) {
        throw haml.templateError(this.lineNumber, this.characterNumber, this.currentLine,
                "An internal parser error has occurred in the HAML parser");
      }

      this.prevToken = this.token;
      this.token = null;

      if (this.buffer === null || this.buffer.length === this.bufferIndex) {
        this.token = { eof: true, token: 'EOF' };
      } else {
        this.initLine();

        if (!this.token) {
          var ch = this.buffer.charCodeAt(this.bufferIndex);
          var ch1 = this.buffer.charCodeAt(this.bufferIndex + 1);
          if (ch === 10 || (ch === 13 && ch1 === 10)) {
            this.token = { eol: true, token: 'EOL' };
            if (ch === 13 && ch1 === 10) {
              this.advanceCharsInBuffer(2);
              this.token.matched = String.fromCharCode(ch) + String.fromCharCode(ch1);
            } else {
              this.advanceCharsInBuffer(1);
              this.token.matched = String.fromCharCode(ch);
            }
            this.characterNumber = 0;
            this.currentLine = this.getCurrentLine();
          }
        }

        if (!this.token) {
          var ws = this.matchToken(this.tokenMatchers.whitespace);
          if (ws) {
            this.token = { ws: true, token: 'WS', tokenString: ws, matched: ws };
            this.advanceCharsInBuffer(ws.length);
          }
        }

        if (!this.token) {
          var element = this.matchToken(this.tokenMatchers.element);
          if (element) {
            this.token = { element: true, token: 'ELEMENT', tokenString: element.substring(1),
              matched: element };
            this.advanceCharsInBuffer(element.length);
          }
        }

        if (!this.token) {
          var id = this.matchToken(this.tokenMatchers.idSelector);
          if (id) {
            this.token = { idSelector: true, token: 'ID', tokenString: id.substring(1), matched: id };
            this.advanceCharsInBuffer(id.length);
          }
        }

        if (!this.token) {
          var c = this.matchToken(this.tokenMatchers.classSelector);
          if (c) {
            this.token = { classSelector: true, token: 'CLASS', tokenString: c.substring(1), matched: c };
            this.advanceCharsInBuffer(c.length);
          }
        }

        if (!this.token) {
          var identifier = this.matchToken(this.tokenMatchers.identifier);
          if (identifier) {
            this.token = { identifier: true, token: 'IDENTIFIER', tokenString: identifier, matched: identifier };
            this.advanceCharsInBuffer(identifier.length);
          }
        }

        if (!this.token) {
          var str = this.matchToken(this.tokenMatchers.quotedString);
          if (!str) {
            str = this.matchToken(this.tokenMatchers.quotedString2);
          }
          if (str) {
            this.token = { string: true, token: 'STRING', tokenString: str.substring(1, str.length - 1),
              matched: str };
            this.advanceCharsInBuffer(str.length);
          }
        }

        if (!this.token) {
          var comment = this.matchToken(this.tokenMatchers.comment);
          if (comment) {
            this.token = { comment: true, token: 'COMMENT', tokenString: comment, matched: comment};
            this.advanceCharsInBuffer(comment.length);
          }
        }

        if (!this.token) {
          var escapeHtml = this.matchToken(this.tokenMatchers.escapeHtml);
          if (escapeHtml) {
            this.token = { escapeHtml: true, token: 'ESCAPEHTML', tokenString: escapeHtml, matched: escapeHtml};
            this.advanceCharsInBuffer(escapeHtml.length);
          }
        }

        if (!this.token) {
          var unescapeHtml = this.matchToken(this.tokenMatchers.unescapeHtml);
          if (unescapeHtml) {
            this.token = { unescapeHtml: true, token: 'UNESCAPEHTML', tokenString: unescapeHtml, matched: unescapeHtml};
            this.advanceCharsInBuffer(unescapeHtml.length);
          }
        }

        if (!this.token) {
          var objectReference = this.matchToken(this.tokenMatchers.objectReference);
          if (objectReference) {
            this.token = { objectReference: true, token: 'OBJECTREFERENCE', tokenString: objectReference.substring(1,
              objectReference.length - 1), matched: objectReference};
            this.advanceCharsInBuffer(objectReference.length);
          }
        }

        if (!this.token) {
          if (this.buffer && this.buffer.charAt(this.bufferIndex) === '{') {
            var i = this.bufferIndex + 1;
            var characterNumberStart = this.characterNumber;
            var lineNumberStart = this.lineNumber;
            var braceCount = 1;
            while (i < this.buffer.length && (braceCount > 1 || this.buffer.charAt(i) !== '}')) {
              if (this.buffer.charAt(i) === '{') {
                braceCount++;
              } else if (this.buffer.charAt(i) === '}') {
                braceCount--;
              }
              i++;
            }
            if (i === this.buffer.length) {
              this.characterNumber = characterNumberStart + 1;
              this.lineNumber = lineNumberStart;
              throw this.parseError('Error parsing attribute hash - Did not find a terminating "}"');
            } else {
              this.token = { attributeHash: true, token: 'ATTRHASH',
                tokenString: this.buffer.substring(this.bufferIndex, i + 1),
                matched: this.buffer.substring(this.bufferIndex, i + 1) };
              this.advanceCharsInBuffer(i - this.bufferIndex + 1);
            }
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '(') {
            this.token = { openBracket: true, token: 'OPENBRACKET', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === ')') {
            this.token = { closeBracket: true, token: 'CLOSEBRACKET', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '=') {
            this.token = { equal: true, token: 'EQUAL', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '/') {
            this.token = { slash: true, token: 'SLASH', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '!') {
            this.token = { exclamation: true, token: 'EXCLAMATION', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '-') {
            this.token = { minus: true, token: 'MINUS', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '&') {
            this.token = { amp: true, token: 'AMP', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '<') {
            this.token = { lt: true, token: 'LT', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '>') {
            this.token = { gt: true, token: 'GT', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (!this.token) {
          if (this.buffer.charAt(this.bufferIndex) === '~') {
            this.token = { tilde: true, token: 'TILDE', tokenString: this.buffer.charAt(this.bufferIndex),
              matched: this.buffer.charAt(this.bufferIndex) };
            this.advanceCharsInBuffer(1);
          }
        }

        if (this.token === null) {
          this.token = { unknown: true, token: 'UNKNOWN' };
        }
      }
      return this.token;
    };

    this.lookAhead = function (numberOfTokens) {
      var token = null;
      if (numberOfTokens > 0) {
        var currentToken = this.token;
        var prevToken = this.prevToken;
        var currentLine = this.currentLine;
        var lineNumber = this.lineNumber;
        var characterNumber = this.characterNumber;
        var bufferIndex = this.bufferIndex;

        for (var i = 0; i < numberOfTokens; i++) {
          token = this.getNextToken();
        }

        this.token = currentToken;
        this.prevToken = prevToken;
        this.currentLine = currentLine;
        this.lineNumber = lineNumber;
        this.characterNumber = characterNumber;
        this.bufferIndex = bufferIndex;
      }
      return token;
    };

    this.initLine = function () {
      if (!this.currentLine && this.currentLine !== "") {
        this.currentLine = this.getCurrentLine();
        this.lineNumber = 1;
        this.characterNumber = 0;
      }
    };

    this.currentLineMatcher = /[^\n]*/g;
    this.getCurrentLine = function (index) {
      var i = index || 0;
      this.currentLineMatcher.lastIndex = this.bufferIndex + i;
      var line = this.currentLineMatcher.exec(this.buffer);
      if (line) {
        return line[0];
      }
      else {
        return '';
      }
    };

    this.parseError = function (error) {
      return haml.templateError(this.lineNumber, this.characterNumber, this.currentLine, error);
    };

    this.skipToEOLorEOF = function () {
      var text = '';

      if (!this.token.eof && !this.token.eol) {
        this.currentLineMatcher.lastIndex = this.bufferIndex;
        var line = this.currentLineMatcher.exec(this.buffer);
        if (line && line.index === this.bufferIndex) {
          text = line[0];
          this.advanceCharsInBuffer(text.length);
          this.getNextToken();
        }
      }

      return text;
    };

    this.advanceCharsInBuffer = function (numChars) {
      for (var i = 0; i < numChars; i++) {
        var ch = this.buffer.charCodeAt(this.bufferIndex + i);
        var ch1 = this.buffer.charCodeAt(this.bufferIndex + i + 1);
        if (ch === 13 && ch1 === 10) {
          this.lineNumber++;
          this.characterNumber = 0;
          this.currentLine = this.getCurrentLine(i);
          i++;
        } else if (ch === 10) {
          this.lineNumber++;
          this.characterNumber = 0;
          this.currentLine = this.getCurrentLine(i);
        } else {
          this.characterNumber++;
        }
      }
      this.bufferIndex += numChars;
    };

    this.currentParsePoint = function () {
      return {
        lineNumber: this.lineNumber,
        characterNumber: this.characterNumber,
        currentLine: this.currentLine
      };
    };

    this.pushBackToken = function () {
      if (!this.token.unknown) {
        this.bufferIndex -= this.token.matched.length;
        this.token = this.prevToken;
      }
    };
  },

  Buffer: function () {
    this.buffer = '';
    this.outputBuffer = '';

    this.append = function (str) {
      if (str && str.length > 0) {
        this.buffer += str;
      }
    };

    this.appendToOutputBuffer = function (str) {
      if (str && str.length > 0) {
        this.flush();
        this.outputBuffer += str;
      }
    };

    this.flush = function () {
      if (this.buffer && this.buffer.length > 0) {
        this.outputBuffer += '    html.push("' + haml.escapeJs(this.buffer) + '");\n';
      }
      this.buffer = '';
    };

    this.output = function () {
      return this.outputBuffer;
    };

    this.trimWhitespace = function () {
      if (this.buffer.length > 0) {
        var i = this.buffer.length - 1;
        while (i > 0) {
          var ch = this.buffer.charAt(i);
          if (ch === ' ' || ch === '\t' || ch === '\n') {
            i--;
          }
          else if (i > 1 && (ch === 'n' || ch === 't') && (this.buffer.charAt(i - 1) === '\\')) {
            i -= 2;
          } else {
            break;
          }
        }
        if (i > 0 && i < this.buffer.length - 1) {
          this.buffer = this.buffer.substring(0, i + 1);
        } else if (i === 0) {
          this.buffer = '';
        }
      }
    };
  }
};
