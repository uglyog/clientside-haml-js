/*jslint plusplus: false, evil: true, regexp: false */

window.haml = {

  compileHaml: function (templateId) {
    if (haml.cache && haml.cache[templateId]) {
      return haml.cache[templateId];
    }

    var tokeniser = new haml.Tokeniser(templateId);
    var outputBuffer = new haml.Buffer();
    var elementStack = [];

    var result = '  var html = "";\n  var result = "";\n  var lineNo, charNo, line;\n';

    // HAML -> WS* (
    //          TEMPLATELINE
    //          | IGNOREDLINE
    //          | EMBEDDEDJS
    //          | JSCODE
    //         )* EOF
    tokeniser.getNextToken();
    while (!tokeniser.token.eof) {
      if (!tokeniser.token.eol) {
        var indent = haml.whitespace(tokeniser);
        if (tokeniser.token.exclamation) {
          haml.ignoredLine(tokeniser, indent, elementStack, outputBuffer);
        } else if (tokeniser.token.equal) {
          haml.embeddedJs(tokeniser, indent, elementStack, outputBuffer);
        } else if (tokeniser.token.minus) {
          haml.jsLine(tokeniser, indent, elementStack, outputBuffer);
        } else {
          haml.templateLine(tokeniser, elementStack, outputBuffer, indent);
        }
      } else {
        tokeniser.getNextToken();
      }
    }

    outputBuffer.append(haml.closeElements(0, elementStack));
    outputBuffer.flush();
    result += outputBuffer.output();

    result += '  return html;\n';

    var fn = new Function('context', result);

    if (!haml.cache) {
      haml.cache = {};
    }
    haml.cache[templateId] = fn;

    return fn;
  },

  ignoredLine: function (tokeniser, indent, elementStack, outputBuffer) {
    if (tokeniser.token.exclamation) {
      tokeniser.getNextToken();
      if (tokeniser.token.ws) {
        indent += haml.whitespace(tokeniser);
      }
      tokeniser.pushBackToken();
      outputBuffer.append(haml.closeElements(indent, elementStack));
      var contents = tokeniser.skipToEOLorEOF();
      outputBuffer.append(haml.indentText(indent) + contents + '\\n');
    }
  },

  embeddedJs: function (tokeniser, indent, elementStack, outputBuffer) {
    if (elementStack) {
      outputBuffer.append(haml.closeElements(indent, elementStack));
    }
    if (tokeniser.token.equal) {
      var currentParsePoint = tokeniser.currentParsePoint();
      var expression = tokeniser.skipToEOLorEOF();
      var indentText = haml.indentText(indent);
      outputBuffer.append(indentText);
      outputBuffer.flush();

      if (!_(expression).includes("return ")) {
        expression = "return " + expression;
      }

      outputBuffer.appendToOutputBuffer(indentText + 'try {\n');
      outputBuffer.appendToOutputBuffer(indentText + '    var value = (function() { with(context) { ' +
        expression + '; }})();\n');
      outputBuffer.appendToOutputBuffer(indentText + '    html += _(value).escapeHTML() + "\\n";\n');
      outputBuffer.appendToOutputBuffer(indentText + '} catch (e) {\n');
      outputBuffer.appendToOutputBuffer(indentText + '  throw new Error(haml.templateError(' +
        currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
        haml.escapeJs(currentParsePoint.currentLine) + '",\n');
      outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n');
      outputBuffer.appendToOutputBuffer(indentText + '}\n');
    }
  },

  jsLine: function (tokeniser, indent, elementStack, outputBuffer) {
    if (tokeniser.token.minus) {
      outputBuffer.flush();
      outputBuffer.appendToOutputBuffer(haml.indentText(indent));
      var line = tokeniser.skipToEOLorEOF();
      outputBuffer.appendToOutputBuffer(line);
      outputBuffer.appendToOutputBuffer('\n');
    }
  },

  // TEMPLATELINE -> ([ELEMENT][IDSELECTOR][CLASSSELECTORS][ATTRIBUTES] [SLASH|CONTENTS])|(!CONTENTS) (EOL|EOF)
  templateLine: function (tokeniser, elementStack, outputBuffer, indent) {
    outputBuffer.append(haml.closeElements(indent, elementStack));

    var ident = '';
    var selfClosingTag = false;
    ident = haml.element(tokeniser);
    var id = haml.idSelector(tokeniser);
    var classes = haml.classSelector(tokeniser);
    var attrList = haml.attributeList(tokeniser);

    var currentParsePoint = tokeniser.currentParsePoint();
    var attributesHash = haml.attributeHash(tokeniser);

    if (tokeniser.token.slash) {
      selfClosingTag = true;
      tokeniser.getNextToken();
    }

    if (ident.length > 0 || id.length > 0 || classes.length > 0) {
      haml.openElement(currentParsePoint, indent, ident, id, classes, attrList, attributesHash, elementStack,
        outputBuffer, selfClosingTag);
    } else if (!tokeniser.token.eol && !tokeniser.token.ws) {
      tokeniser.pushBackToken();
    }

    var contents = haml.elementContents(tokeniser, indent + 1, outputBuffer);
    haml.eolOrEof(tokeniser);

    if (selfClosingTag && contents.length > 0) {
      throw tokeniser.parseError("A self-closing tag can not have any contents");
    }
    else if (contents.length > 0) {
      if (contents.match(/^\\%/)) {
        contents = contents.substring(1);
      }
      var i = indent;
      if (ident.length > 0) {
        i += 1;
      }
      outputBuffer.append(haml.indentText(i) + contents + '\\n');
    }
  },

  elementContents: function (tokeniser, indent, outputBuffer) {
    var contents = '';

    if (!tokeniser.token.eof) {
      if (tokeniser.token.ws) {
        tokeniser.getNextToken();
      }

      if (tokeniser.token.exclamation) {
        contents = tokeniser.skipToEOLorEOF();
      } else if (tokeniser.token.equal) {
        haml.embeddedJs(tokeniser, indent, null, outputBuffer);
      } else if (!tokeniser.token.eol) {
        tokeniser.pushBackToken();
        contents = _(tokeniser.skipToEOLorEOF()).escapeHTML();
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

  closeElement: function (indent, elementStack) {
    var html = '';
    if (elementStack[indent]) {
      html += haml.indentText(indent) + '</' + elementStack[indent].tag + '>\\n';
      elementStack[indent] = null;
    }
    return html;
  },

  closeElements: function (indent, elementStack) {
    var result = '';
    for (var i = elementStack.length - 1; i >= indent; (i--)) {
      result += haml.closeElement(i, elementStack);
    }
    return result;
  },

  openElement: function (currentParsePoint, indent, ident, id, classes, attributeList, attributeHash,
                             elementStack, outputBuffer, selfClosingTag) {
    var element = ident;
    if (element.length === 0) {
      element = 'div';
    }

    outputBuffer.append(haml.indentText(indent) + '<' + element);
    if (attributeHash.length > 0) {
      outputBuffer.flush();
      outputBuffer.appendToOutputBuffer('    html += haml.generateElementAttributes(context, "' +
        id + '", ["' +
        classes.join('","') + '"], ' +
        JSON.stringify(attributeList) + ', ' +
        (attributeHash.length > 0 ? '"' + haml.escapeJs(attributeHash) + '"' : 'null') + ', ' +
        currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' +
        haml.escapeJs(currentParsePoint.currentLine) + '");\n');
    } else {
      outputBuffer.append(haml.generateElementAttributes(null, id, classes, attributeList, null,
        currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine));
    }
    if (selfClosingTag) {
      outputBuffer.append("/>\\n");
    } else {
      outputBuffer.append(">\\n");
      elementStack[indent] = { tag: element };
    }
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
      else if (attrName === 'class') {
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

  generateElementAttributes: function (context, id, classes, attrList, attrHash, lineNumber, characterNumber,
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

    if (attrHash && attrHash.length > 0) {
      try {
        attrHash = attrHash.replace('class:', '"class":');
        var hash = new Function('context', 'with(context) { return ' + attrHash + '; }').call(null, context);
        if (hash) {
          for (attr in hash) {
            if (hash.hasOwnProperty(attr)) {
              attributes = haml.combineAttributes(attributes, attr, hash[attr]);
            }
          }
        }
      } catch (e) {
        throw haml.templateError(lineNumber, characterNumber, currentLine, "Error evaluating attribute hash - " + e);
      }
    }

    var html = '';
    if (attributes) {
      for (attr in attributes) {
        if (attributes.hasOwnProperty(attr) && attributes[attr]) {
          if (attr === 'id' && attributes[attr] instanceof Array) {
            html += ' ' + attr + '="' + attributes[attr].join('-') + '"';
          } else if (attr === 'class' && attributes[attr] instanceof Array) {
            html += ' ' + attr + '="' + attributes[attr].join(' ') + '"';
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

  evaluateExpression: function (context, expression, lineNumber, characterNumber, currentLine, escapeHtml) {
    try {
      var expressionToEval = 'with(context) { ';
      if (!_(expression).includes('return ')) {
        expressionToEval += 'return ';
      }
      expressionToEval += expression;
      expressionToEval += '; }';
      var value = new Function('context', expressionToEval).call(null, context);
      if (escapeHtml) {
        return _(value).escapeHTML();
      } else {
        return value;
      }
    } catch (e) {
      throw haml.templateError(lineNumber, characterNumber, currentLine, "Error evaluating expression - " + e);
    }
  },

  Tokeniser: function (templateId) {
    this.buffer = null;
    this.bufferIndex = null;
    this.prevToken = null;
    this.token = null;

    if (templateId) {
      var template = document.getElementById(templateId);
      if (template) {
        this.buffer = template.innerHTML;
        this.bufferIndex = 0;
      }
    }

    this.tokenMatchers = {
      whitespace:     /\s+/g,
      element:        /%[a-zA-Z][a-zA-Z0-9]*/g,
      idSelector:     /#[a-zA-Z_\-][a-zA-Z0-9_\-]*/g,
      classSelector:  /\.[a-zA-Z0-9_\-]+/g,
      identifier:     /[a-zA-Z][a-zA-Z0-9]*/g,
      quotedString:   /[\'][^\']*[\']/g,
      quotedString2:   /[\"][^\"]*[\"]/g
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
              this.token.matched = ch + ch1;
            } else {
              this.advanceCharsInBuffer(1);
              this.token.matched = ch;
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
          if (this.buffer && this.buffer.charAt(this.bufferIndex) === '{') {
            var i = this.bufferIndex;
            var characterNumberStart = this.characterNumber;
            var lineNumberStart = this.lineNumber;
            while (i < this.buffer.length && this.buffer.charAt(i) !== '}') {
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

        if (this.token === null) {
          this.token = { unknown: true, token: 'UNKNOWN' };
        }
      }
      return this.token;
    };

    this.initLine = function () {
      if (!this.currentLine) {
        this.currentLine = this.getCurrentLine();
        this.lineNumber = 1;
        this.characterNumber = 0;
      }
    };

    this.currentLineMatcher = /[^\n]*/g;
    this.getCurrentLine = function () {
      this.currentLineMatcher.lastIndex = this.bufferIndex;
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
          i++;
        } else if (ch === 10) {
          this.lineNumber++;
          this.characterNumber = 0;
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
        this.outputBuffer += str;
      }
    };

    this.flush = function () {
      if (this.buffer && this.buffer.length > 0) {
        this.outputBuffer += '    html += "' + haml.escapeJs(this.buffer) + '";\n';
      }
      this.buffer = '';
    };

    this.output = function () {
      return this.outputBuffer;
    };
  }
};