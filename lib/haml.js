(function() {
  var Buffer, JsCodeGenerator, Tokeniser, root;
  var __hasProp = Object.prototype.hasOwnProperty;

  root = this;

  root.haml = {
    compileHaml: function(templateId) {
      var fn, result;
      haml.cache || (haml.cache = {});
      if (haml.cache[templateId]) return haml.cache[templateId];
      result = this.compileHamlToJs(new haml.Tokeniser({
        templateId: templateId
      }), new haml.JsCodeGenerator());
      fn = null;
      try {
        fn = new Function('context', result);
      } catch (e) {
        throw "Incorrect embedded code has resulted in an invalid Haml function - " + e + "\nGenerated Function:\n" + result;
      }
      return haml.cache[templateId] = fn;
    },
    compileStringToJs: function(string) {
      var result;
      result = this.compileHamlToJs(new haml.Tokeniser({
        template: string
      }), new haml.JsCodeGenerator());
      try {
        return new Function('context', result);
      } catch (e) {
        throw "Incorrect embedded code has resulted in an invalid Haml function - " + e + "\nGenerated Function:\n" + result;
      }
    },
    compileHamlToJsString: function(string) {
      var result;
      result = 'function (context) {\n';
      result += this.compileHamlToJs(new haml.Tokeniser({
        template: string
      }), new haml.JsCodeGenerator());
      return result += '}\n';
    },
    compileHamlToJs: function(tokeniser, generator) {
      var elementStack, indent;
      elementStack = [];
      generator.initOutput();
      tokeniser.getNextToken();
      while (!tokeniser.token.eof) {
        if (!tokeniser.token.eol) {
          indent = haml.whitespace(tokeniser);
          if (tokeniser.token.exclamation) {
            haml.ignoredLine(tokeniser, indent, elementStack, generator);
          } else if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml || tokeniser.token.tilde) {
            haml.embeddedJs(tokeniser, indent, elementStack, {
              innerWhitespace: true
            }, generator);
          } else if (tokeniser.token.minus) {
            haml.jsLine(tokeniser, indent, elementStack, generator);
          } else if (tokeniser.token.comment || tokeniser.token.slash) {
            haml.commentLine(tokeniser, indent, elementStack, generator);
          } else if (tokeniser.token.amp) {
            haml.escapedLine(tokeniser, indent, elementStack, generator);
          } else {
            haml.templateLine(tokeniser, elementStack, indent, generator);
          }
        } else {
          tokeniser.getNextToken();
        }
      }
      haml.closeElements(0, elementStack, tokeniser, generator);
      return generator.closeAndReturnOutput();
    },
    commentLine: function(tokeniser, indent, elementStack, generator) {
      var contents;
      if (tokeniser.token.comment) {
        return tokeniser.skipToEOLorEOF();
      } else if (tokeniser.token.slash) {
        haml.closeElements(indent, elementStack, tokeniser, generator);
        generator.outputBuffer.append(haml.indentText(indent));
        generator.outputBuffer.append("<!--");
        contents = tokeniser.skipToEOLorEOF();
        if (contents && contents.length > 0) {
          generator.outputBuffer.append(contents);
        }
        if (contents && _(contents).startsWith('[') && contents.match(/\]\s*$/)) {
          elementStack[indent] = {
            htmlConditionalComment: true
          };
          generator.outputBuffer.append(">");
        } else {
          elementStack[indent] = {
            htmlComment: true
          };
        }
        if (haml.tagHasContents(indent, tokeniser)) {
          return generator.outputBuffer.append("\\n");
        }
      }
    },
    escapedLine: function(tokeniser, indent, elementStack, generator) {
      var contents;
      if (tokeniser.token.amp) {
        haml.closeElements(indent, elementStack, tokeniser, generator);
        generator.outputBuffer.append(haml.indentText(indent));
        contents = tokeniser.skipToEOLorEOF();
        if (contents && contents.length > 0) {
          generator.outputBuffer.append(haml.escapeHTML(contents));
        }
        return generator.outputBuffer.append("\\n");
      }
    },
    ignoredLine: function(tokeniser, indent, elementStack, generator) {
      var contents;
      if (tokeniser.token.exclamation) {
        tokeniser.getNextToken();
        if (tokeniser.token.ws) indent += haml.whitespace(tokeniser);
        tokeniser.pushBackToken();
        haml.closeElements(indent, elementStack, tokeniser, generator);
        contents = tokeniser.skipToEOLorEOF();
        return generator.outputBuffer.append(haml.indentText(indent) + contents + '\\n');
      }
    },
    embeddedJs: function(tokeniser, indent, elementStack, tagOptions, generator) {
      var currentParsePoint, escapeHtml, expression, indentText, perserveWhitespace;
      if (elementStack) {
        haml.closeElements(indent, elementStack, tokeniser, generator);
      }
      if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml || tokeniser.token.tilde) {
        escapeHtml = tokeniser.token.escapeHtml || tokeniser.token.equal;
        perserveWhitespace = tokeniser.token.tilde;
        currentParsePoint = tokeniser.currentParsePoint();
        expression = tokeniser.skipToEOLorEOF();
        indentText = haml.indentText(indent);
        if (!tagOptions || tagOptions.innerWhitespace) {
          generator.outputBuffer.append(indentText);
        }
        generator.appendEmbeddedCode(indentText, expression, escapeHtml, perserveWhitespace, currentParsePoint);
        if (!tagOptions || tagOptions.innerWhitespace) {
          return generator.outputBuffer.append("\\n");
        }
      }
    },
    jsLine: function(tokeniser, indent, elementStack, generator) {
      var line;
      if (tokeniser.token.minus) {
        haml.closeElements(indent, elementStack, tokeniser, generator);
        line = tokeniser.skipToEOLorEOF();
        generator.appendCodeLine(haml.indentText(indent), line);
        if (generator.lineMatchesStartFunctionBlock(line)) {
          return elementStack[indent] = {
            fnBlock: true
          };
        } else if (generator.lineMatchesStartBlock(line)) {
          return elementStack[indent] = {
            block: true
          };
        }
      }
    },
    templateLine: function(tokeniser, elementStack, indent, generator) {
      var attrList, attributesHash, classes, contents, currentParsePoint, i, id, ident, objectRef, tagOptions;
      if (!tokeniser.token.eol) {
        haml.closeElements(indent, elementStack, tokeniser, generator);
      }
      ident = haml.element(tokeniser);
      id = haml.idSelector(tokeniser);
      classes = haml.classSelector(tokeniser);
      objectRef = haml.objectReference(tokeniser);
      attrList = haml.attributeList(tokeniser);
      currentParsePoint = tokeniser.currentParsePoint();
      attributesHash = haml.attributeHash(tokeniser);
      tagOptions = {
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
        haml.openElement(currentParsePoint, indent, ident, id, classes, objectRef, attrList, attributesHash, elementStack, tagOptions, generator);
      } else if (!haml.isEolOrEof(tokeniser) && !tokeniser.token.ws) {
        tokeniser.pushBackToken();
      }
      contents = haml.elementContents(tokeniser, indent + 1, tagOptions, generator);
      haml.eolOrEof(tokeniser);
      if (tagOptions.selfClosingTag && contents.length > 0) {
        throw haml.templateError(currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine, "A self-closing tag can not have any contents");
      } else if (contents.length > 0) {
        if (contents.match(/^\\%/)) contents = contents.substring(1);
        if (tagOptions.innerWhitespace && haml.lineHasElement(ident, id, classes) || (!haml.lineHasElement(ident, id, classes) && haml.parentInnerWhitespace(elementStack, indent))) {
          i = indent;
          if (ident.length > 0) i += 1;
          return generator.outputBuffer.append(haml.indentText(i) + contents + '\\n');
        } else {
          return generator.outputBuffer.append(_(contents).trim() + '\\n');
        }
      } else if (!haml.lineHasElement(ident, id, classes) && tagOptions.innerWhitespace) {
        return generator.outputBuffer.append(haml.indentText(indent) + '\\n');
      }
    },
    elementContents: function(tokeniser, indent, tagOptions, generator) {
      var contents;
      contents = '';
      if (!tokeniser.token.eof) {
        if (tokeniser.token.ws) tokeniser.getNextToken();
        if (tokeniser.token.exclamation) {
          contents = tokeniser.skipToEOLorEOF();
        } else if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml) {
          haml.embeddedJs(tokeniser, indent, null, tagOptions, generator);
        } else if (!tokeniser.token.eol) {
          tokeniser.pushBackToken();
          contents = tokeniser.skipToEOLorEOF();
        }
      }
      return contents;
    },
    attributeHash: function(tokeniser) {
      var attr;
      attr = '';
      if (tokeniser.token.attributeHash) {
        attr = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return attr;
    },
    objectReference: function(tokeniser) {
      var attr;
      attr = '';
      if (tokeniser.token.objectReference) {
        attr = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return attr;
    },
    attributeList: function(tokeniser) {
      var attr, attrList;
      attrList = {};
      if (tokeniser.token.openBracket) {
        tokeniser.getNextToken();
        while (!tokeniser.token.closeBracket) {
          attr = haml.attribute(tokeniser);
          if (attr) {
            attrList[attr.name] = attr.value;
          } else {
            tokeniser.getNextToken();
          }
          if (tokeniser.token.ws || tokeniser.token.eol) {
            tokeniser.getNextToken();
          } else if (!tokeniser.token.closeBracket && !tokeniser.token.identifier) {
            throw tokeniser.parseError("Expecting either an attribute name to continue the attibutes or a closing " + "bracket to end");
          }
        }
        tokeniser.getNextToken();
      }
      return attrList;
    },
    attribute: function(tokeniser) {
      var attr, name;
      attr = null;
      if (tokeniser.token.identifier) {
        name = tokeniser.token.tokenString;
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
        attr = {
          name: name,
          value: tokeniser.token.tokenString
        };
        tokeniser.getNextToken();
      }
      return attr;
    },
    closeElement: function(indent, elementStack, tokeniser, generator) {
      var innerWhitespace, outerWhitespace;
      if (elementStack[indent]) {
        if (elementStack[indent].htmlComment) {
          generator.outputBuffer.append(haml.indentText(indent) + '-->\\n');
        } else if (elementStack[indent].htmlConditionalComment) {
          generator.outputBuffer.append(haml.indentText(indent) + '<![endif]-->\\n');
        } else if (elementStack[indent].block) {
          if (!tokeniser.token.minus || !tokeniser.matchToken(/\s*\}/g)) {
            generator.closeOffCodeBlock(haml.indentText(indent));
          }
        } else if (elementStack[indent].fnBlock) {
          if (!tokeniser.token.minus || !tokeniser.matchToken(/\s*\}/g)) {
            generator.closeOffFunctionBlock(haml.indentText(indent));
          }
        } else {
          innerWhitespace = !elementStack[indent].tagOptions || elementStack[indent].tagOptions.innerWhitespace;
          if (innerWhitespace) {
            generator.outputBuffer.append(haml.indentText(indent));
          } else {
            generator.outputBuffer.trimWhitespace();
          }
          generator.outputBuffer.append('</' + elementStack[indent].tag + '>');
          outerWhitespace = !elementStack[indent].tagOptions || elementStack[indent].tagOptions.outerWhitespace;
          if (haml.parentInnerWhitespace(elementStack, indent) && outerWhitespace) {
            generator.outputBuffer.append('\\n');
          }
        }
        return elementStack[indent] = null;
      }
    },
    closeElements: function(indent, elementStack, tokeniser, generator) {
      var i, _results;
      i = elementStack.length - 1;
      _results = [];
      while (i >= indent) {
        _results.push(haml.closeElement(i--, elementStack, tokeniser, generator));
      }
      return _results;
    },
    openElement: function(currentParsePoint, indent, ident, id, classes, objectRef, attributeList, attributeHash, elementStack, tagOptions, generator) {
      var element, parentInnerWhitespace, tagOuterWhitespace;
      element = ident.length === 0 ? "div" : ident;
      parentInnerWhitespace = haml.parentInnerWhitespace(elementStack, indent);
      tagOuterWhitespace = !tagOptions || tagOptions.outerWhitespace;
      if (!tagOuterWhitespace) generator.outputBuffer.trimWhitespace();
      if (indent > 0 && parentInnerWhitespace && tagOuterWhitespace) {
        generator.outputBuffer.append(haml.indentText(indent));
      }
      generator.outputBuffer.append('<' + element);
      if (attributeHash.length > 0 || objectRef.length > 0) {
        generator.generateCodeForDynamicAttributes(id, classes, attributeList, attributeHash, objectRef, currentParsePoint);
      } else {
        generator.outputBuffer.append(haml.generateElementAttributes(null, id, classes, null, attributeList, null, currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine));
      }
      if (tagOptions.selfClosingTag) {
        generator.outputBuffer.append("/>");
        if (tagOptions.outerWhitespace) {
          return generator.outputBuffer.append("\\n");
        }
      } else {
        generator.outputBuffer.append(">");
        elementStack[indent] = {
          tag: element,
          tagOptions: tagOptions
        };
        if (tagOptions.innerWhitespace) {
          return generator.outputBuffer.append("\\n");
        }
      }
    },
    combineAttributes: function(attributes, attrName, attrValue) {
      var classes;
      if (haml.hasValue(attrValue)) {
        if (attrName === 'id' && attrValue.toString().length > 0) {
          if (attributes && attributes.id instanceof Array) {
            attributes.id.unshift(attrValue);
          } else if (attributes && attributes.id) {
            attributes.id = [attributes.id, attrValue];
          } else if (attributes) {
            attributes.id = attrValue;
          } else {
            attributes = {
              id: attrValue
            };
          }
        } else if (attrName === 'for' && attrValue.toString().length > 0) {
          if (attributes && attributes['for'] instanceof Array) {
            attributes['for'].unshift(attrValue);
          } else if (attributes && attributes['for']) {
            attributes['for'] = [attributes['for'], attrValue];
          } else if (attributes) {
            attributes['for'] = attrValue;
          } else {
            attributes = {
              'for': attrValue
            };
          }
        } else if (attrName === 'class') {
          classes = [];
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
            attributes = {
              'class': classes
            };
          }
        } else if (attrName !== 'id') {
          attributes || (attributes = {});
          attributes[attrName] = attrValue;
        }
      }
      return attributes;
    },
    isSelfClosingTag: function(tag) {
      return tag === 'meta' || tag === 'img' || tag === 'link' || tag === 'script' || tag === 'br' || tag === 'hr';
    },
    tagHasContents: function(indent, tokeniser) {
      var nextToken;
      if (!haml.isEolOrEof(tokeniser)) {
        return true;
      } else {
        nextToken = tokeniser.lookAhead(1);
        return nextToken.ws && nextToken.tokenString.length / 2 > indent;
      }
    },
    parentInnerWhitespace: function(elementStack, indent) {
      return indent === 0 || (!elementStack[indent - 1] || !elementStack[indent - 1].tagOptions || elementStack[indent - 1].tagOptions.innerWhitespace);
    },
    lineHasElement: function(ident, id, classes) {
      return ident.length > 0 || id.length > 0 || classes.length > 0;
    },
    generateElementAttributes: function(context, id, classes, objRefFn, attrList, attrFunction, lineNumber, characterNumber, currentLine) {
      var attr, attributes, className, dataAttr, dataAttributes, hash, html, object, objectId;
      attributes = {};
      attributes = haml.combineAttributes(attributes, 'id', id);
      if (classes.length > 0 && classes[0].length > 0) {
        attributes = haml.combineAttributes(attributes, 'class', classes);
      }
      if (attrList) {
        for (attr in attrList) {
          if (!__hasProp.call(attrList, attr)) continue;
          attributes = haml.combineAttributes(attributes, attr, attrList[attr]);
        }
      }
      if (objRefFn) {
        try {
          object = objRefFn.call(this, context);
          if (object) {
            objectId = null;
            if (object.id) {
              objectId = object.id;
            } else if (object.get) {
              objectId = object.get('id');
            }
            attributes = haml.combineAttributes(attributes, 'id', objectId);
            className = null;
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
          hash = attrFunction.call(this, context);
          if (hash) {
            for (attr in hash) {
              if (!__hasProp.call(hash, attr)) continue;
              if (attr === 'data') {
                dataAttributes = hash[attr];
                for (dataAttr in dataAttributes) {
                  if (!__hasProp.call(dataAttributes, dataAttr)) continue;
                  attributes = haml.combineAttributes(attributes, 'data-' + dataAttr, dataAttributes[dataAttr]);
                }
              } else {
                attributes = haml.combineAttributes(attributes, attr, hash[attr]);
              }
            }
          }
        } catch (ex) {
          throw haml.templateError(lineNumber, characterNumber, currentLine, "Error evaluating attribute hash - " + ex);
        }
      }
      html = '';
      if (attributes) {
        for (attr in attributes) {
          if (!__hasProp.call(attributes, attr)) continue;
          if (haml.hasValue(attributes[attr])) {
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
    hasValue: function(value) {
      return (value != null) && value !== false;
    },
    attrValue: function(attr, value) {
      if (attr === 'selected' || attr === 'checked' || attr === 'disabled') {
        return attr;
      } else {
        return value;
      }
    },
    indentText: function(indent) {
      var i, text;
      text = '';
      i = 0;
      while (i < indent) {
        text += '  ';
        i++;
      }
      return text;
    },
    whitespace: function(tokeniser) {
      var indent;
      indent = 0;
      if (tokeniser.token.ws) {
        indent = tokeniser.token.tokenString.length / 2;
        tokeniser.getNextToken();
      }
      return indent;
    },
    element: function(tokeniser) {
      var ident;
      ident = '';
      if (tokeniser.token.element) {
        ident = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return ident;
    },
    eolOrEof: function(tokeniser) {
      if (tokeniser.token.eol) {
        return tokeniser.getNextToken();
      } else if (!tokeniser.token.eof) {
        throw tokeniser.parseError("Expected EOL or EOF");
      }
    },
    idSelector: function(tokeniser) {
      var id;
      id = '';
      if (tokeniser.token.idSelector) {
        id = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return id;
    },
    classSelector: function(tokeniser) {
      var classes;
      classes = [];
      while (tokeniser.token.classSelector) {
        classes.push(tokeniser.token.tokenString);
        tokeniser.getNextToken();
      }
      return classes;
    },
    templateError: function(lineNumber, characterNumber, currentLine, error) {
      var i, message;
      message = error + " at line " + lineNumber + " and character " + characterNumber + ":\n" + currentLine + '\n';
      i = 0;
      while (i < characterNumber - 1) {
        message += '-';
        i++;
      }
      message += '^';
      return message;
    },
    isEolOrEof: function(tokeniser) {
      return tokeniser.token.eol || tokeniser.token.eof;
    },
    perserveWhitespace: function(str) {
      var i, out, re, result;
      re = /<[a-zA-Z]+>[^<]*<\/[a-zA-Z]+>/g;
      out = '';
      i = 0;
      result = re.exec(str);
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
    escapeHTML: function(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, "&#39;");
    }
  };

  Tokeniser = (function() {

    function Tokeniser(options) {
      var template;
      this.buffer = null;
      this.bufferIndex = null;
      this.prevToken = null;
      this.token = null;
      if (options.templateId) {
        template = document.getElementById(options.templateId);
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
    ;
    }

    Tokeniser.prototype.advanceCharsInBuffer = function(numChars) {
      var ch, ch1, i;
      i = 0;
      while (i < numChars) {
        ch = this.buffer.charCodeAt(this.bufferIndex + i);
        ch1 = this.buffer.charCodeAt(this.bufferIndex + i + 1);
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
        i++;
      }
      return this.bufferIndex += numChars;
    };

    Tokeniser.prototype.currentParsePoint = function() {
      return {
        lineNumber: this.lineNumber,
        characterNumber: this.characterNumber,
        currentLine: this.currentLine
      };
    };

    Tokeniser.prototype.pushBackToken = function() {
      if (!this.token.unknown) {
        this.bufferIndex -= this.token.matched.length;
        return this.token = this.prevToken;
      }
    };

    return Tokeniser;

  })();

  haml.Tokeniser = Tokeniser;

  Buffer = (function() {

    function Buffer(generator) {
      this.generator = generator;
      this.buffer = '';
      this.outputBuffer = '';
    }

    Buffer.prototype.append = function(str) {
      if (str && str.length > 0) return this.buffer += str;
    };

    Buffer.prototype.appendToOutputBuffer = function(str) {
      if (str && str.length > 0) {
        this.flush();
        return this.outputBuffer += str;
      }
    };

    Buffer.prototype.flush = function() {
      if (this.buffer && this.buffer.length > 0) {
        this.outputBuffer += '    html.push("' + this.generator.escapeJs(this.buffer) + '");\n';
      }
      return this.buffer = '';
    };

    Buffer.prototype.output = function() {
      return this.outputBuffer;
    };

    Buffer.prototype.trimWhitespace = function() {
      var ch, i;
      if (this.buffer.length > 0) {
        i = this.buffer.length - 1;
        while (i > 0) {
          ch = this.buffer.charAt(i);
          if (ch === ' ' || ch === '\t' || ch === '\n') {
            i--;
          } else if (i > 1 && (ch === 'n' || ch === 't') && (this.buffer.charAt(i - 1) === '\\')) {
            i -= 2;
          } else {
            break;
          }
        }
        if (i > 0 && i < this.buffer.length - 1) {
          return this.buffer = this.buffer.substring(0, i + 1);
        } else if (i === 0) {
          return this.buffer = '';
        }
      }
    };

    return Buffer;

  })();

  haml.Buffer = Buffer;

  JsCodeGenerator = (function() {

    function JsCodeGenerator() {
      this.outputBuffer = new haml.Buffer(this);
    }

    JsCodeGenerator.prototype.appendEmbeddedCode = function(indentText, expression, escapeContents, perserveWhitespace, currentParsePoint) {
      this.outputBuffer.flush();
      this.outputBuffer.appendToOutputBuffer(indentText + 'try {\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    var value = eval("' + expression.replace(/"/g, '\\"').replace(/\\n/g, '\\\\n') + '");\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    value = value === null ? "" : value;');
      if (escapeContents) {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.escapeHTML(String(value)));\n');
      } else if (perserveWhitespace) {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.perserveWhitespace(String(value)));\n');
      } else {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(String(value));\n');
      }
      this.outputBuffer.appendToOutputBuffer(indentText + '} catch (e) {\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '  throw new Error(haml.templateError(' + currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' + this.escapeJs(currentParsePoint.currentLine) + '",\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n');
      return this.outputBuffer.appendToOutputBuffer(indentText + '}\n');
    };

    JsCodeGenerator.prototype.initOutput = function() {
      return this.outputBuffer.appendToOutputBuffer('  var html = [];\n' + '  var hashFunction = null, hashObject = null, objRef = null, objRefFn = null;\n  with (context) {\n');
    };

    JsCodeGenerator.prototype.closeAndReturnOutput = function() {
      this.outputBuffer.flush();
      return this.outputBuffer.output() + '  }\n  return html.join("");\n';
    };

    JsCodeGenerator.prototype.appendCodeLine = function(indentText, line) {
      this.outputBuffer.flush();
      this.outputBuffer.appendToOutputBuffer(indentText);
      this.outputBuffer.appendToOutputBuffer(line);
      return this.outputBuffer.appendToOutputBuffer('\n');
    };

    JsCodeGenerator.prototype.lineMatchesStartFunctionBlock = function(line) {
      return line.match(/function\s\((,?\s*\w+)*\)\s*\{\s*$/);
    };

    JsCodeGenerator.prototype.lineMatchesStartBlock = function(line) {
      return line.match(/\{\s*$/);
    };

    JsCodeGenerator.prototype.closeOffCodeBlock = function(indentText) {
      this.outputBuffer.flush();
      return this.outputBuffer.appendToOutputBuffer(indentText + '}\n');
    };

    JsCodeGenerator.prototype.closeOffFunctionBlock = function(indentText) {
      this.outputBuffer.flush();
      return this.outputBuffer.appendToOutputBuffer(indentText + '});\n');
    };

    JsCodeGenerator.prototype.generateCodeForDynamicAttributes = function(id, classes, attributeList, attributeHash, objectRef, currentParsePoint) {
      this.outputBuffer.flush();
      if (attributeHash.length > 0) {
        attributeHash = this.replaceReservedWordsInHash(attributeHash);
        this.outputBuffer.appendToOutputBuffer('    hashFunction = function () { return eval("hashObject = ' + attributeHash.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"); };\n');
      }
      if (objectRef.length > 0) {
        this.outputBuffer.appendToOutputBuffer('    objRefFn = function () { return eval("objRef = ' + objectRef.replace(/"/g, '\\"') + '"); };\n');
      }
      return this.outputBuffer.appendToOutputBuffer('    html.push(haml.generateElementAttributes(context, "' + id + '", ["' + classes.join('","') + '"], objRefFn, ' + JSON.stringify(attributeList) + ', hashFunction, ' + currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' + this.escapeJs(currentParsePoint.currentLine) + '"));\n');
    };

    JsCodeGenerator.prototype.replaceReservedWordsInHash = function(hash) {
      var reservedWord, resultHash, _i, _len, _ref;
      resultHash = hash;
      _ref = ['class', 'for'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        reservedWord = _ref[_i];
        resultHash = resultHash.replace(reservedWord + ':', '"' + reservedWord + '":');
      }
      return resultHash;
    };

    JsCodeGenerator.prototype.escapeJs = function(jsStr) {
      return jsStr.replace(/"/g, '\\"');
    };

    return JsCodeGenerator;

  })();

  haml.JsCodeGenerator = JsCodeGenerator;

}).call(this);
