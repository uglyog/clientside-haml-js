
/*
  clientside HAML compiler for Javascript and Coffeescript (Version 4)

  Copyright 2011-12, Ronald Holshausen (https://github.com/uglyog)
  Released under the MIT License (http://www.opensource.org/licenses/MIT)
*/

(function() {
  var Buffer, CodeGenerator, CoffeeCodeGenerator, HamlRuntime, JsCodeGenerator, Tokeniser, filters, root,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  root = this;

  /*
    Haml runtime functions. These are used both by the compiler and the generated template functions
  */

  HamlRuntime = {
    /*
        Taken from underscore.string.js escapeHTML, and replace the apos entity with character 39 so that it renders
        correctly in IE7
    */
    escapeHTML: function(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, "&#39;");
    },
    /*
        Provides the implementation to preserve the whitespace as per the HAML reference
    */
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
    /*
        Generates a error message including the current line in the source where the error occurred
    */
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
    /*
        Generates the attributes for the element by combining all the various sources together
    */
    generateElementAttributes: function(context, id, classes, objRefFn, attrList, attrFunction, lineNumber, characterNumber, currentLine) {
      var attr, attributes, className, dataAttr, dataAttributes, hash, html, object, objectId;
      attributes = {};
      attributes = this.combineAttributes(attributes, 'id', id);
      if (classes.length > 0 && classes[0].length > 0) {
        attributes = this.combineAttributes(attributes, 'class', classes);
      }
      if (attrList) {
        for (attr in attrList) {
          if (!__hasProp.call(attrList, attr)) continue;
          attributes = this.combineAttributes(attributes, attr, attrList[attr]);
        }
      }
      if (objRefFn) {
        try {
          object = objRefFn.call(context, context);
          if (object) {
            objectId = null;
            if (object.id) {
              objectId = object.id;
            } else if (object.get) {
              objectId = object.get('id');
            }
            attributes = this.combineAttributes(attributes, 'id', objectId);
            className = null;
            if (object['class']) {
              className = object['class'];
            } else if (object.get) {
              className = object.get('class');
            }
            attributes = this.combineAttributes(attributes, 'class', className);
          }
        } catch (e) {
          throw haml.HamlRuntime.templateError(lineNumber, characterNumber, currentLine, "Error evaluating object reference - " + e);
        }
      }
      if (attrFunction) {
        try {
          hash = attrFunction.call(context, context);
          if (hash) {
            for (attr in hash) {
              if (!__hasProp.call(hash, attr)) continue;
              if (attr === 'data') {
                dataAttributes = hash[attr];
                for (dataAttr in dataAttributes) {
                  if (!__hasProp.call(dataAttributes, dataAttr)) continue;
                  attributes = this.combineAttributes(attributes, 'data-' + dataAttr, dataAttributes[dataAttr]);
                }
              } else {
                attributes = this.combineAttributes(attributes, attr, hash[attr]);
              }
            }
          }
        } catch (ex) {
          throw haml.HamlRuntime.templateError(lineNumber, characterNumber, currentLine, "Error evaluating attribute hash - " + ex);
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
    /*
        Returns a white space string with a length of indent * 2
    */
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
    /*
        Combines the attributes in the attributres hash with the given attribute and value
        ID, FOR and CLASS attributes will expand to arrays when multiple values are provided
    */
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
    }
  };

  /*
    HAML Tokiniser: This class is responsible for parsing the haml source into tokens
  */

  Tokeniser = (function() {

    Tokeniser.prototype.currentLineMatcher = /[^\n]*/g;

    Tokeniser.prototype.tokenMatchers = {
      whitespace: /[ \t]+/g,
      element: /%[a-zA-Z][a-zA-Z0-9]*/g,
      idSelector: /#[a-zA-Z_\-][a-zA-Z0-9_\-]*/g,
      classSelector: /\.[a-zA-Z0-9_\-]+/g,
      identifier: /[a-zA-Z][a-zA-Z0-9\-]*/g,
      quotedString: /[\'][^\'\n]*[\']/g,
      quotedString2: /[\"][^\"\n]*[\"]/g,
      comment: /\-#/g,
      escapeHtml: /\&=/g,
      unescapeHtml: /\!=/g,
      objectReference: /\[[a-zA-Z_@][a-zA-Z0-9_]*\]/g,
      doctype: /!!!/g,
      continueLine: /\|\s*\n/g,
      filter: /:\w+/g
    };

    function Tokeniser(options) {
      var errorFn, successFn, template,
        _this = this;
      this.buffer = null;
      this.bufferIndex = null;
      this.prevToken = null;
      this.token = null;
      if (options.templateId != null) {
        template = document.getElementById(options.templateId);
        if (template) {
          this.buffer = template.text;
          this.bufferIndex = 0;
        } else {
          throw "Did not find a template with ID '" + options.templateId + "'";
        }
      } else if (options.template != null) {
        this.buffer = options.template;
        this.bufferIndex = 0;
      } else if (options.templateUrl != null) {
        errorFn = function(jqXHR, textStatus, errorThrown) {
          throw "Failed to fetch haml template at URL " + options.templateUrl + ": " + textStatus + " " + errorThrown;
        };
        successFn = function(data) {
          _this.buffer = data;
          return _this.bufferIndex = 0;
        };
        jQuery.ajax({
          url: options.templateUrl,
          success: successFn,
          error: errorFn,
          dataType: 'text',
          async: false,
          xhrFields: {
            withCredentials: true
          }
        });
      }
    }

    /*
        Try to match a token with the given regexp
    */

    Tokeniser.prototype.matchToken = function(matcher) {
      var result;
      matcher.lastIndex = this.bufferIndex;
      result = matcher.exec(this.buffer);
      if ((result != null ? result.index : void 0) === this.bufferIndex) {
        return result[0];
      }
    };

    /*
        Match a multi-character token
    */

    Tokeniser.prototype.matchMultiCharToken = function(matcher, token, tokenStr) {
      var matched, _ref;
      if (!this.token) {
        matched = this.matchToken(matcher);
        if (matched) {
          this.token = token;
          this.token.tokenString = (_ref = typeof tokenStr === "function" ? tokenStr(matched) : void 0) != null ? _ref : matched;
          this.token.matched = matched;
          return this.advanceCharsInBuffer(matched.length);
        }
      }
    };

    /*
        Match a single character token
    */

    Tokeniser.prototype.matchSingleCharToken = function(ch, token) {
      if (!this.token && this.buffer.charAt(this.bufferIndex) === ch) {
        this.token = token;
        this.token.tokenString = ch;
        this.token.matched = ch;
        return this.advanceCharsInBuffer(1);
      }
    };

    /*
        Match and return the next token in the input buffer
    */

    Tokeniser.prototype.getNextToken = function() {
      var braceCount, ch, ch1, characterNumberStart, i, lineNumberStart, str;
      if (isNaN(this.bufferIndex)) {
        throw haml.HamlRuntime.templateError(this.lineNumber, this.characterNumber, this.currentLine, "An internal parser error has occurred in the HAML parser");
      }
      this.prevToken = this.token;
      this.token = null;
      if (this.buffer === null || this.buffer.length === this.bufferIndex) {
        this.token = {
          eof: true,
          token: 'EOF'
        };
      } else {
        this.initLine();
        if (!this.token) {
          ch = this.buffer.charCodeAt(this.bufferIndex);
          ch1 = this.buffer.charCodeAt(this.bufferIndex + 1);
          if (ch === 10 || (ch === 13 && ch1 === 10)) {
            this.token = {
              eol: true,
              token: 'EOL'
            };
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
        this.matchMultiCharToken(this.tokenMatchers.whitespace, {
          ws: true,
          token: 'WS'
        });
        this.matchMultiCharToken(this.tokenMatchers.continueLine, {
          continueLine: true,
          token: 'CONTINUELINE'
        });
        this.matchMultiCharToken(this.tokenMatchers.element, {
          element: true,
          token: 'ELEMENT'
        }, function(matched) {
          return matched.substring(1);
        });
        this.matchMultiCharToken(this.tokenMatchers.idSelector, {
          idSelector: true,
          token: 'ID'
        }, function(matched) {
          return matched.substring(1);
        });
        this.matchMultiCharToken(this.tokenMatchers.classSelector, {
          classSelector: true,
          token: 'CLASS'
        }, function(matched) {
          return matched.substring(1);
        });
        this.matchMultiCharToken(this.tokenMatchers.identifier, {
          identifier: true,
          token: 'IDENTIFIER'
        });
        this.matchMultiCharToken(this.tokenMatchers.doctype, {
          doctype: true,
          token: 'DOCTYPE'
        });
        this.matchMultiCharToken(this.tokenMatchers.filter, {
          filter: true,
          token: 'FILTER'
        }, function(matched) {
          return matched.substring(1);
        });
        if (!this.token) {
          str = this.matchToken(this.tokenMatchers.quotedString);
          if (!str) str = this.matchToken(this.tokenMatchers.quotedString2);
          if (str) {
            this.token = {
              string: true,
              token: 'STRING',
              tokenString: str.substring(1, str.length - 1),
              matched: str
            };
            this.advanceCharsInBuffer(str.length);
          }
        }
        this.matchMultiCharToken(this.tokenMatchers.comment, {
          comment: true,
          token: 'COMMENT'
        });
        this.matchMultiCharToken(this.tokenMatchers.escapeHtml, {
          escapeHtml: true,
          token: 'ESCAPEHTML'
        });
        this.matchMultiCharToken(this.tokenMatchers.unescapeHtml, {
          unescapeHtml: true,
          token: 'UNESCAPEHTML'
        });
        this.matchMultiCharToken(this.tokenMatchers.objectReference, {
          objectReference: true,
          token: 'OBJECTREFERENCE'
        }, function(matched) {
          return matched.substring(1, matched.length - 1);
        });
        if (!this.token) {
          if (this.buffer && this.buffer.charAt(this.bufferIndex) === '{') {
            i = this.bufferIndex + 1;
            characterNumberStart = this.characterNumber;
            lineNumberStart = this.lineNumber;
            braceCount = 1;
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
              this.token = {
                attributeHash: true,
                token: 'ATTRHASH',
                tokenString: this.buffer.substring(this.bufferIndex, i + 1),
                matched: this.buffer.substring(this.bufferIndex, i + 1)
              };
              this.advanceCharsInBuffer(i - this.bufferIndex + 1);
            }
          }
        }
        this.matchSingleCharToken('(', {
          openBracket: true,
          token: 'OPENBRACKET'
        });
        this.matchSingleCharToken(')', {
          closeBracket: true,
          token: 'CLOSEBRACKET'
        });
        this.matchSingleCharToken('=', {
          equal: true,
          token: 'EQUAL'
        });
        this.matchSingleCharToken('/', {
          slash: true,
          token: 'SLASH'
        });
        this.matchSingleCharToken('!', {
          exclamation: true,
          token: 'EXCLAMATION'
        });
        this.matchSingleCharToken('-', {
          minus: true,
          token: 'MINUS'
        });
        this.matchSingleCharToken('&', {
          amp: true,
          token: 'AMP'
        });
        this.matchSingleCharToken('<', {
          lt: true,
          token: 'LT'
        });
        this.matchSingleCharToken('>', {
          gt: true,
          token: 'GT'
        });
        this.matchSingleCharToken('~', {
          tilde: true,
          token: 'TILDE'
        });
        if (this.token === null) {
          this.token = {
            unknown: true,
            token: 'UNKNOWN'
          };
        }
      }
      return this.token;
    };

    /*
        Look ahead a number of tokens and return the token found
    */

    Tokeniser.prototype.lookAhead = function(numberOfTokens) {
      var bufferIndex, characterNumber, currentLine, currentToken, i, lineNumber, prevToken, token;
      token = null;
      if (numberOfTokens > 0) {
        currentToken = this.token;
        prevToken = this.prevToken;
        currentLine = this.currentLine;
        lineNumber = this.lineNumber;
        characterNumber = this.characterNumber;
        bufferIndex = this.bufferIndex;
        i = 0;
        while (i++ < numberOfTokens) {
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

    /*
        Initilise the line and character counters
    */

    Tokeniser.prototype.initLine = function() {
      if (!this.currentLine && this.currentLine !== "") {
        this.currentLine = this.getCurrentLine();
        this.lineNumber = 1;
        return this.characterNumber = 0;
      }
    };

    /*
        Returns the current line in the input buffer
    */

    Tokeniser.prototype.getCurrentLine = function(index) {
      var line;
      this.currentLineMatcher.lastIndex = this.bufferIndex + (index != null ? index : 0);
      line = this.currentLineMatcher.exec(this.buffer);
      if (line) {
        return line[0];
      } else {
        return '';
      }
    };

    /*
        Returns an error string filled out with the line and character counters
    */

    Tokeniser.prototype.parseError = function(error) {
      return haml.HamlRuntime.templateError(this.lineNumber, this.characterNumber, this.currentLine, error);
    };

    /*
        Skips to the end of the line and returns the string that was skipped
    */

    Tokeniser.prototype.skipToEOLorEOF = function() {
      var contents, line, text;
      text = '';
      if (!(this.token.eof || this.token.eol)) {
        if (!this.token.unknown) text += this.token.matched;
        this.currentLineMatcher.lastIndex = this.bufferIndex;
        line = this.currentLineMatcher.exec(this.buffer);
        if (line && line.index === this.bufferIndex) {
          contents = _(line[0]).rtrim();
          if (_(contents).endsWith('|')) {
            text += contents.substring(0, contents.length - 1);
            this.advanceCharsInBuffer(contents.length - 1);
            this.getNextToken();
            text += this.parseMultiLine();
          } else {
            text += line[0];
            this.advanceCharsInBuffer(line[0].length);
            this.getNextToken();
          }
        }
      }
      return text;
    };

    /*
        Parses a multiline code block and returns the parsed text
    */

    Tokeniser.prototype.parseMultiLine = function() {
      var contents, line, text;
      text = '';
      while (this.token.continueLine) {
        this.currentLineMatcher.lastIndex = this.bufferIndex;
        line = this.currentLineMatcher.exec(this.buffer);
        if (line && line.index === this.bufferIndex) {
          contents = _(line[0]).rtrim();
          if (_(contents).endsWith('|')) {
            text += contents.substring(0, contents.length - 1);
            this.advanceCharsInBuffer(contents.length - 1);
          }
          this.getNextToken();
        }
      }
      return text;
    };

    /*
        Advances the input buffer pointer by a number of characters, updating the line and character counters
    */

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

    /*
        Returns the current line and character counters
    */

    Tokeniser.prototype.currentParsePoint = function() {
      return {
        lineNumber: this.lineNumber,
        characterNumber: this.characterNumber,
        currentLine: this.currentLine
      };
    };

    /*
        Pushes back the current token onto the front of the input buffer
    */

    Tokeniser.prototype.pushBackToken = function() {
      if (!this.token.unknown && !this.token.eof) {
        this.bufferIndex -= this.token.matched.length;
        return this.token = this.prevToken;
      }
    };

    /*
        Is the current token an end of line or end of input buffer
    */

    Tokeniser.prototype.isEolOrEof = function() {
      return this.token.eol || this.token.eof;
    };

    return Tokeniser;

  })();

  /*
    Provides buffering between the generated javascript and html contents
  */

  Buffer = (function() {

    function Buffer(generator) {
      this.generator = generator;
      this.buffer = '';
      this.outputBuffer = '';
    }

    Buffer.prototype.append = function(str) {
      if (this.buffer.length === 0) this.generator.mark();
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
        this.outputBuffer += this.generator.generateFlush(this.buffer);
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

  /*
    Common code shared across all code generators
  */

  CodeGenerator = (function() {

    function CodeGenerator() {}

    CodeGenerator.prototype.embeddedCodeBlockMatcher = /#{([^}]*)}/g;

    return CodeGenerator;

  })();

  /*
    Code generator that generates a Javascript function body
  */

  JsCodeGenerator = (function(_super) {

    __extends(JsCodeGenerator, _super);

    function JsCodeGenerator() {
      this.outputBuffer = new haml.Buffer(this);
    }

    /*
        Append a line with embedded javascript code
    */

    JsCodeGenerator.prototype.appendEmbeddedCode = function(indentText, expression, escapeContents, perserveWhitespace, currentParsePoint) {
      this.outputBuffer.flush();
      this.outputBuffer.appendToOutputBuffer(indentText + 'try {\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    var value = eval("' + expression.replace(/"/g, '\\"').replace(/\\n/g, '\\\\n') + '");\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    value = value === null ? "" : value;');
      if (escapeContents) {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.HamlRuntime.escapeHTML(String(value)));\n');
      } else if (perserveWhitespace) {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(haml.HamlRuntime.perserveWhitespace(String(value)));\n');
      } else {
        this.outputBuffer.appendToOutputBuffer(indentText + '    html.push(String(value));\n');
      }
      this.outputBuffer.appendToOutputBuffer(indentText + '} catch (e) {\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '  throw new Error(haml.HamlRuntime.templateError(' + currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' + this.escapeCode(currentParsePoint.currentLine) + '",\n');
      this.outputBuffer.appendToOutputBuffer(indentText + '    "Error evaluating expression - " + e));\n');
      return this.outputBuffer.appendToOutputBuffer(indentText + '}\n');
    };

    /*
        Initilising the output buffer with any variables or code
    */

    JsCodeGenerator.prototype.initOutput = function() {
      return this.outputBuffer.appendToOutputBuffer('  var html = [];\n' + '  var hashFunction = null, hashObject = null, objRef = null, objRefFn = null;\n  with (context || {}) {\n');
    };

    /*
        Flush and close the output buffer and return the contents
    */

    JsCodeGenerator.prototype.closeAndReturnOutput = function() {
      this.outputBuffer.flush();
      return this.outputBuffer.output() + '  }\n  return html.join("");\n';
    };

    /*
        Append a line of code to the output buffer
    */

    JsCodeGenerator.prototype.appendCodeLine = function(line, eol) {
      this.outputBuffer.flush();
      this.outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(this.indent));
      this.outputBuffer.appendToOutputBuffer(line);
      return this.outputBuffer.appendToOutputBuffer(eol);
    };

    /*
        Does the current line end with a function declaration?
    */

    JsCodeGenerator.prototype.lineMatchesStartFunctionBlock = function(line) {
      return line.match(/function\s*\((,?\s*\w+)*\)\s*\{\s*$/);
    };

    /*
        Does the current line end with a starting code block
    */

    JsCodeGenerator.prototype.lineMatchesStartBlock = function(line) {
      return line.match(/\{\s*$/);
    };

    /*
        Generate the code to close off a code block
    */

    JsCodeGenerator.prototype.closeOffCodeBlock = function(tokeniser) {
      if (!(tokeniser.token.minus && tokeniser.matchToken(/\s*\}/g))) {
        this.outputBuffer.flush();
        return this.outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(this.indent) + '}\n');
      }
    };

    /*
        Generate the code to close off a function parameter
    */

    JsCodeGenerator.prototype.closeOffFunctionBlock = function(tokeniser) {
      if (!(tokeniser.token.minus && tokeniser.matchToken(/\s*\}/g))) {
        this.outputBuffer.flush();
        return this.outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(this.indent) + '});\n');
      }
    };

    /*
        Generate the code for dynamic attributes ({} form)
    */

    JsCodeGenerator.prototype.generateCodeForDynamicAttributes = function(id, classes, attributeList, attributeHash, objectRef, currentParsePoint) {
      this.outputBuffer.flush();
      if (attributeHash.length > 0) {
        attributeHash = this.replaceReservedWordsInHash(attributeHash);
        this.outputBuffer.appendToOutputBuffer('    hashFunction = function () { return eval("hashObject = ' + attributeHash.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"); };\n');
      }
      if (objectRef.length > 0) {
        this.outputBuffer.appendToOutputBuffer('    objRefFn = function () { return eval("objRef = ' + objectRef.replace(/"/g, '\\"') + '"); };\n');
      }
      return this.outputBuffer.appendToOutputBuffer('    html.push(haml.HamlRuntime.generateElementAttributes(context, "' + id + '", ["' + classes.join('","') + '"], objRefFn, ' + JSON.stringify(attributeList) + ', hashFunction, ' + currentParsePoint.lineNumber + ', ' + currentParsePoint.characterNumber + ', "' + this.escapeCode(currentParsePoint.currentLine) + '"));\n');
    };

    /*
        Clean any reserved words in the given hash
    */

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

    /*
        Escape the line so it is safe to put into a javascript string
    */

    JsCodeGenerator.prototype.escapeCode = function(jsStr) {
      return jsStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    };

    /*
        Generate a function from the function body
    */

    JsCodeGenerator.prototype.generateJsFunction = function(functionBody) {
      try {
        return new Function('context', functionBody);
      } catch (e) {
        throw "Incorrect embedded code has resulted in an invalid Haml function - " + e + "\nGenerated Function:\n" + functionBody;
      }
    };

    /*
        Generate the code required to support a buffer flush
    */

    JsCodeGenerator.prototype.generateFlush = function(bufferStr) {
      return '    html.push("' + this.escapeCode(bufferStr) + '");\n';
    };

    /*
        Set the current indent level
    */

    JsCodeGenerator.prototype.setIndent = function(indent) {
      return this.indent = indent;
    };

    /*
        Save the current indent level if required
    */

    JsCodeGenerator.prototype.mark = function() {};

    /*
        Append the text contents to the buffer, expanding any embedded code
    */

    JsCodeGenerator.prototype.appendTextContents = function(text, shouldInterpolate, currentParsePoint, options) {
      if (options == null) options = {};
      if (shouldInterpolate && text.match(/#{[^}]*}/)) {
        return this.interpolateString(text, currentParsePoint, options);
      } else {
        return this.outputBuffer.append(this.processText(text, options));
      }
    };

    /*
        Interpolate any embedded code in the text
    */

    JsCodeGenerator.prototype.interpolateString = function(text, currentParsePoint, options) {
      var index, precheedingChar, precheedingChar2, result;
      index = 0;
      result = this.embeddedCodeBlockMatcher.exec(text);
      while (result) {
        if (result.index > 0) precheedingChar = text.charAt(result.index - 1);
        if (result.index > 1) precheedingChar2 = text.charAt(result.index - 2);
        if (precheedingChar === '\\' && precheedingChar2 !== '\\') {
          if (result.index !== 0) {
            this.outputBuffer.append(this.processText(text.substring(index, result.index - 1), options));
          }
          this.outputBuffer.append(this.processText(result[0]), options);
        } else {
          this.outputBuffer.append(this.processText(text.substring(index, result.index)), options);
          this.appendEmbeddedCode(HamlRuntime.indentText(this.indent + 1), result[1], options.escapeHTML, options.perserveWhitespace, currentParsePoint);
        }
        index = this.embeddedCodeBlockMatcher.lastIndex;
        result = this.embeddedCodeBlockMatcher.exec(text);
      }
      if (index < text.length) {
        return this.outputBuffer.append(this.processText(text.substring(index), options));
      }
    };

    /*
        process text based on escape and preserve flags
    */

    JsCodeGenerator.prototype.processText = function(text, options) {
      if (options != null ? options.escapeHTML : void 0) {
        return haml.HamlRuntime.escapeHTML(text);
      } else if (options != null ? options.perserveWhitespace : void 0) {
        return haml.HamlRuntime.perserveWhitespace(text);
      } else {
        return text;
      }
    };

    return JsCodeGenerator;

  })(CodeGenerator);

  /*
    Code generator that generates a coffeescript function body
  */

  CoffeeCodeGenerator = (function(_super) {

    __extends(CoffeeCodeGenerator, _super);

    function CoffeeCodeGenerator() {
      this.outputBuffer = new haml.Buffer(this);
    }

    CoffeeCodeGenerator.prototype.appendEmbeddedCode = function(indentText, expression, escapeContents, perserveWhitespace, currentParsePoint) {
      var indent;
      this.outputBuffer.flush();
      indent = this.calcCodeIndent();
      this.outputBuffer.appendToOutputBuffer(indent + "try\n");
      this.outputBuffer.appendToOutputBuffer(indent + "  exp = CoffeeScript.compile('" + expression.replace(/'/g, "\\'").replace(/\\n/g, '\\\\n') + "', bare: true)\n");
      this.outputBuffer.appendToOutputBuffer(indent + "  value = eval(exp)\n");
      this.outputBuffer.appendToOutputBuffer(indent + "  value ?= ''\n");
      if (escapeContents) {
        this.outputBuffer.appendToOutputBuffer(indent + "  html.push(haml.HamlRuntime.escapeHTML(String(value)))\n");
      } else if (perserveWhitespace) {
        this.outputBuffer.appendToOutputBuffer(indent + "  html.push(haml.HamlRuntime.perserveWhitespace(String(value)))\n");
      } else {
        this.outputBuffer.appendToOutputBuffer(indent + "  html.push(String(value))\n");
      }
      this.outputBuffer.appendToOutputBuffer(indent + "catch e \n");
      this.outputBuffer.appendToOutputBuffer(indent + "  throw new Error(haml.HamlRuntime.templateError(" + currentParsePoint.lineNumber + ", " + currentParsePoint.characterNumber + ", '" + this.escapeCode(currentParsePoint.currentLine) + "',\n");
      return this.outputBuffer.appendToOutputBuffer(indent + "    'Error evaluating expression - ' + e))\n");
    };

    CoffeeCodeGenerator.prototype.initOutput = function() {
      return this.outputBuffer.appendToOutputBuffer('html = []\n');
    };

    CoffeeCodeGenerator.prototype.closeAndReturnOutput = function() {
      this.outputBuffer.flush();
      return this.outputBuffer.output() + 'return html.join("")\n';
    };

    CoffeeCodeGenerator.prototype.appendCodeLine = function(line, eol) {
      this.outputBuffer.flush();
      if ((this.prevCodeIndent != null) && this.prevCodeIndent < this.indent) {
        this.outputBuffer.appendToOutputBuffer(HamlRuntime.indentText(this.indent - this.prevCodeIndent));
      }
      this.outputBuffer.appendToOutputBuffer(_(line).trim());
      this.outputBuffer.appendToOutputBuffer(eol);
      return this.prevCodeIndent = this.indent;
    };

    CoffeeCodeGenerator.prototype.lineMatchesStartFunctionBlock = function(line) {
      return line.match(/\) [\-=]>\s*$/);
    };

    CoffeeCodeGenerator.prototype.lineMatchesStartBlock = function(line) {
      return true;
    };

    CoffeeCodeGenerator.prototype.closeOffCodeBlock = function(tokeniser) {
      return this.outputBuffer.flush();
    };

    CoffeeCodeGenerator.prototype.closeOffFunctionBlock = function(tokeniser) {
      return this.outputBuffer.flush();
    };

    CoffeeCodeGenerator.prototype.generateCodeForDynamicAttributes = function(id, classes, attributeList, attributeHash, objectRef, currentParsePoint) {
      this.outputBuffer.flush();
      if (attributeHash.length > 0) {
        attributeHash = this.replaceReservedWordsInHash(attributeHash);
        this.outputBuffer.appendToOutputBuffer("hashFunction = () -> s = CoffeeScript.compile('" + attributeHash.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "', bare: true); eval 'hashObject = ' + s\n");
      }
      if (objectRef.length > 0) {
        this.outputBuffer.appendToOutputBuffer("objRefFn = () -> s = CoffeeScript.compile('" + objectRef.replace(/'/g, "\\'") + "', bare: true); eval 'objRef = ' + s\n");
      }
      return this.outputBuffer.appendToOutputBuffer("html.push(haml.HamlRuntime.generateElementAttributes(this, '" + id + "', ['" + classes.join("','") + "'], objRefFn ? null, " + JSON.stringify(attributeList) + ", hashFunction ? null, " + currentParsePoint.lineNumber + ", " + currentParsePoint.characterNumber + ", '" + this.escapeCode(currentParsePoint.currentLine) + "'))\n");
    };

    CoffeeCodeGenerator.prototype.replaceReservedWordsInHash = function(hash) {
      var reservedWord, resultHash, _i, _len, _ref;
      resultHash = hash;
      _ref = ['class', 'for'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        reservedWord = _ref[_i];
        resultHash = resultHash.replace(reservedWord + ':', "'" + reservedWord + "':");
      }
      return resultHash;
    };

    /*
        Escapes the string for insertion into the generated code. Embedded code blocks in strings must not be escaped
    */

    CoffeeCodeGenerator.prototype.escapeCode = function(str) {
      var index, outString, precheedingChar, precheedingChar2, result;
      outString = '';
      index = 0;
      result = this.embeddedCodeBlockMatcher.exec(str);
      while (result) {
        if (result.index > 0) precheedingChar = str.charAt(result.index - 1);
        if (result.index > 1) precheedingChar2 = str.charAt(result.index - 2);
        if (precheedingChar === '\\' && precheedingChar2 !== '\\') {
          if (result.index !== 0) {
            outString += this._escapeText(str.substring(index, result.index - 1));
          }
          outString += this._escapeText('\\' + result[0]);
        } else {
          outString += this._escapeText(str.substring(index, result.index));
          outString += result[0];
        }
        index = this.embeddedCodeBlockMatcher.lastIndex;
        result = this.embeddedCodeBlockMatcher.exec(str);
      }
      if (index < str.length) outString += this._escapeText(str.substring(index));
      return outString;
    };

    CoffeeCodeGenerator.prototype._escapeText = function(text) {
      return text.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\\"').replace(/\n/g, '\\n').replace(/(^|[^\\]{2})\\\\#{/g, '$1\\#{');
    };

    /*
        Generates the javascript function by compiling the given code with coffeescript compiler
    */

    CoffeeCodeGenerator.prototype.generateJsFunction = function(functionBody) {
      var fn;
      try {
        fn = CoffeeScript.compile(functionBody, {
          bare: true
        });
        return new Function(fn);
      } catch (e) {
        throw "Incorrect embedded code has resulted in an invalid Haml function - " + e + "\nGenerated Function:\n" + fn;
      }
    };

    CoffeeCodeGenerator.prototype.generateFlush = function(bufferStr) {
      return this.calcCodeIndent() + "html.push('" + this.escapeCode(bufferStr) + "')\n";
    };

    CoffeeCodeGenerator.prototype.setIndent = function(indent) {
      return this.indent = indent;
    };

    CoffeeCodeGenerator.prototype.mark = function() {
      return this.prevIndent = this.indent;
    };

    CoffeeCodeGenerator.prototype.calcCodeIndent = function() {
      if ((this.prevCodeIndent != null) && this.prevIndent > this.prevCodeIndent) {
        return HamlRuntime.indentText(this.prevIndent - this.prevCodeIndent);
      } else {
        return '';
      }
    };

    /*
        Append the text contents to the buffer (interpolating embedded code not required for coffeescript)
    */

    CoffeeCodeGenerator.prototype.appendTextContents = function(text, shouldInterpolate, currentParsePoint, options) {
      var prefix, suffix;
      if (shouldInterpolate && text.match(/#{[^}]*}/)) {
        this.outputBuffer.flush();
        prefix = suffix = '';
        if (options != null ? options.escapeHTML : void 0) {
          prefix = 'haml.HamlRuntime.escapeHTML(';
          suffix = ')';
        } else if (options != null ? options.perserveWhitespace : void 0) {
          prefix = 'haml.HamlRuntime.perserveWhitespace(';
          suffix = ')';
        }
        return this.outputBuffer.appendToOutputBuffer(this.calcCodeIndent() + 'html.push(' + prefix + '"' + this.escapeCode(text) + '"' + suffix + ')\n');
      } else {
        if (options != null ? options.escapeHTML : void 0) {
          text = haml.HamlRuntime.escapeHTML(text);
        }
        if (options != null ? options.perserveWhitespace : void 0) {
          text = haml.HamlRuntime.perserveWhitespace(text);
        }
        return this.outputBuffer.append(text);
      }
    };

    return CoffeeCodeGenerator;

  })(CodeGenerator);

  /*
    HAML filters are functions that take 3 parameters
      contents: The contents block for the filter an array of lines of text
      generator: The current generator for the compiled function
      indentText: A whitespace string specifying the current indent level
      currentParsePoint: line and character counters for the current parse point in the input buffer
  */

  filters = {
    /*
        Plain filter, just renders the text in the block
    */
    plain: function(contents, generator, indentText, currentParsePoint) {
      var line, _i, _len;
      for (_i = 0, _len = contents.length; _i < _len; _i++) {
        line = contents[_i];
        generator.appendTextContents(indentText + line + '\n', true, currentParsePoint);
      }
      return true;
    },
    /*
        Wraps the filter block in a javascript tag
    */
    javascript: function(contents, generator, indentText, currentParsePoint) {
      var line, _i, _len;
      generator.outputBuffer.append(indentText + "<script type=\"text/javascript\">\n");
      generator.outputBuffer.append(indentText + "//<![CDATA[\n");
      for (_i = 0, _len = contents.length; _i < _len; _i++) {
        line = contents[_i];
        generator.appendTextContents(indentText + line + '\n', true, currentParsePoint);
      }
      generator.outputBuffer.append(indentText + "//]]>\n");
      return generator.outputBuffer.append(indentText + "</script>\n");
    },
    /*
        Wraps the filter block in a style tag
    */
    css: function(contents, generator, indentText, currentParsePoint) {
      var line, _i, _len;
      generator.outputBuffer.append(indentText + "<style type=\"text/css\">\n");
      generator.outputBuffer.append(indentText + "/*<![CDATA[*/\n");
      for (_i = 0, _len = contents.length; _i < _len; _i++) {
        line = contents[_i];
        generator.appendTextContents(indentText + line + '\n', true, currentParsePoint);
      }
      generator.outputBuffer.append(indentText + "/*]]>*/\n");
      return generator.outputBuffer.append(indentText + "</style>\n");
    },
    /*
        Wraps the filter block in a CDATA tag
    */
    cdata: function(contents, generator, indentText, currentParsePoint) {
      var line, _i, _len;
      generator.outputBuffer.append(indentText + "<![CDATA[\n");
      for (_i = 0, _len = contents.length; _i < _len; _i++) {
        line = contents[_i];
        generator.appendTextContents(indentText + line + '\n', true, currentParsePoint);
      }
      return generator.outputBuffer.append(indentText + "]]>\n");
    },
    /*
        Preserve filter, preserved blocks of text aren't indented, and newlines are replaced with the HTML escape code for newlines
    */
    preserve: function(contents, generator, indentText, currentParsePoint) {
      return generator.appendTextContents(contents.join('\n') + '\n', true, currentParsePoint, {
        perserveWhitespace: true
      });
    },
    /*
        Escape filter, renders the text in the block with html escaped
    */
    escape: function(contents, generator, indentText, currentParsePoint) {
      var line, _i, _len;
      for (_i = 0, _len = contents.length; _i < _len; _i++) {
        line = contents[_i];
        generator.appendTextContents(indentText + line + '\n', true, currentParsePoint, {
          escapeHTML: true
        });
      }
      return true;
    }
  };

  /*
    Main haml compiler implemtation
  */

  root.haml = {
    /*
        Compiles the haml provided in the parameters to a Javascipt function
    
        Parameter:
          String: Looks for a haml template in dom with this ID
          Option Hash: The following options determines how haml sources and compiles the template
            source - This contains the template in string form
            sourceId - This contains the element ID in the dom which contains the haml source
            sourceUrl - This contains the URL where the template can be fetched from
            outputFormat - This determines what is returned, and has the following values:
                             string - The javascript source code
                             function - A javascript function (default)
            generator - Which code generator to use
                             javascript (default)
                             coffeescript
    
        Returns a javascript function
    */
    compileHaml: function(options) {
      var codeGenerator, result, tokinser;
      if (typeof options === 'string') {
        return this._compileHamlTemplate(options, new haml.JsCodeGenerator());
      } else {
        if (options.generator !== 'coffeescript') {
          codeGenerator = new haml.JsCodeGenerator();
        } else {
          codeGenerator = new haml.CoffeeCodeGenerator();
        }
        if (options.source != null) {
          tokinser = new haml.Tokeniser({
            template: options.source
          });
        } else if (options.sourceId != null) {
          tokinser = new haml.Tokeniser({
            templateId: options.sourceId
          });
        } else if (options.sourceUrl != null) {
          tokinser = new haml.Tokeniser({
            templateUrl: options.sourceUrl
          });
        } else {
          throw "No template source specified for compileHaml. You need to provide a source, sourceId or sourceUrl option";
        }
        result = this._compileHamlToJs(tokinser, codeGenerator);
        if (options.outputFormat !== 'string') {
          return codeGenerator.generateJsFunction(result);
        } else {
          return "function (context) {\n" + result + "}\n";
        }
      }
    },
    /*
        Compiles the haml in the script block with ID templateId using the coffeescript generator
        Returns a javascript function
    */
    compileCoffeeHaml: function(templateId) {
      return this._compileHamlTemplate(templateId, new haml.CoffeeCodeGenerator());
    },
    /*
        Compiles the haml in the passed in string
        Returns a javascript function
    */
    compileStringToJs: function(string) {
      var codeGenerator, result;
      codeGenerator = new haml.JsCodeGenerator();
      result = this._compileHamlToJs(new haml.Tokeniser({
        template: string
      }), codeGenerator);
      return codeGenerator.generateJsFunction(result);
    },
    /*
        Compiles the haml in the passed in string using the coffeescript generator
        Returns a javascript function
    */
    compileCoffeeHamlFromString: function(string) {
      var codeGenerator, result;
      codeGenerator = new haml.CoffeeCodeGenerator();
      result = this._compileHamlToJs(new haml.Tokeniser({
        template: string
      }), codeGenerator);
      return codeGenerator.generateJsFunction(result);
    },
    /*
        Compiles the haml in the passed in string
        Returns the javascript function source
    
        This is mainly used for precompiling the haml templates so they can be packaged.
    */
    compileHamlToJsString: function(string) {
      var result;
      result = 'function (context) {\n';
      result += this._compileHamlToJs(new haml.Tokeniser({
        template: string
      }), new haml.JsCodeGenerator());
      return result += '}\n';
    },
    _compileHamlTemplate: function(templateId, codeGenerator) {
      var fn, result;
      haml.cache || (haml.cache = {});
      if (haml.cache[templateId]) return haml.cache[templateId];
      result = this._compileHamlToJs(new haml.Tokeniser({
        templateId: templateId
      }), codeGenerator);
      fn = codeGenerator.generateJsFunction(result);
      haml.cache[templateId] = fn;
      return fn;
    },
    _compileHamlToJs: function(tokeniser, generator) {
      var elementStack, indent;
      elementStack = [];
      generator.initOutput();
      tokeniser.getNextToken();
      while (!tokeniser.token.eof) {
        if (!tokeniser.token.eol) {
          indent = this._whitespace(tokeniser);
          generator.setIndent(indent);
          if (tokeniser.token.eol) {
            generator.outputBuffer.append(HamlRuntime.indentText(indent) + tokeniser.token.matched);
            tokeniser.getNextToken();
          } else if (tokeniser.token.doctype) {
            this._doctype(tokeniser, indent, generator);
          } else if (tokeniser.token.exclamation) {
            this._ignoredLine(tokeniser, indent, elementStack, generator);
          } else if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml || tokeniser.token.tilde) {
            this._embeddedJs(tokeniser, indent, elementStack, {
              innerWhitespace: true
            }, generator);
          } else if (tokeniser.token.minus) {
            this._jsLine(tokeniser, indent, elementStack, generator);
          } else if (tokeniser.token.comment || tokeniser.token.slash) {
            this._commentLine(tokeniser, indent, elementStack, generator);
          } else if (tokeniser.token.amp) {
            this._escapedLine(tokeniser, indent, elementStack, generator);
          } else if (tokeniser.token.filter) {
            this._filter(tokeniser, indent, generator);
          } else {
            this._templateLine(tokeniser, elementStack, indent, generator);
          }
        } else {
          generator.outputBuffer.append(tokeniser.token.matched);
          tokeniser.getNextToken();
        }
      }
      this._closeElements(0, elementStack, tokeniser, generator);
      return generator.closeAndReturnOutput();
    },
    _doctype: function(tokeniser, indent, generator) {
      var contents, params;
      if (tokeniser.token.doctype) {
        generator.outputBuffer.append(HamlRuntime.indentText(indent));
        tokeniser.getNextToken();
        if (tokeniser.token.ws) tokeniser.getNextToken();
        contents = tokeniser.skipToEOLorEOF();
        if (contents && contents.length > 0) {
          params = contents.split(/\s+/);
          switch (params[0]) {
            case 'XML':
              if (params.length > 1) {
                generator.outputBuffer.append("<?xml version='1.0' encoding='" + params[1] + "' ?>");
              } else {
                generator.outputBuffer.append("<?xml version='1.0' encoding='utf-8' ?>");
              }
              break;
            case 'Strict':
              generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">');
              break;
            case 'Frameset':
              generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">');
              break;
            case '5':
              generator.outputBuffer.append('<!DOCTYPE html>');
              break;
            case '1.1':
              generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">');
              break;
            case 'Basic':
              generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">');
              break;
            case 'Mobile':
              generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">');
              break;
            case 'RDFa':
              generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML+RDFa 1.0//EN" "http://www.w3.org/MarkUp/DTD/xhtml-rdfa-1.dtd">');
          }
        } else {
          generator.outputBuffer.append('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">');
        }
        generator.outputBuffer.append(this._newline(tokeniser));
        return tokeniser.getNextToken();
      }
    },
    _filter: function(tokeniser, indent, generator) {
      var filter, filterBlock, i, line;
      if (tokeniser.token.filter) {
        filter = tokeniser.token.tokenString;
        if (!haml.filters[filter]) {
          throw tokeniser.parseError("Filter '" + filter + "' not registered. Filter functions need to be added to 'haml.filters'.");
        }
        tokeniser.skipToEOLorEOF();
        tokeniser.getNextToken();
        i = haml._whitespace(tokeniser);
        filterBlock = [];
        while (!tokeniser.token.eof && i > indent) {
          line = tokeniser.skipToEOLorEOF();
          filterBlock.push(haml.HamlRuntime.indentText(i - indent - 1) + line);
          tokeniser.getNextToken();
          i = haml._whitespace(tokeniser);
        }
        haml.filters[filter](filterBlock, generator, haml.HamlRuntime.indentText(indent), tokeniser.currentParsePoint());
        return tokeniser.pushBackToken();
      }
    },
    _commentLine: function(tokeniser, indent, elementStack, generator) {
      var contents, i;
      if (tokeniser.token.comment) {
        tokeniser.skipToEOLorEOF();
        tokeniser.getNextToken();
        i = this._whitespace(tokeniser);
        while (!tokeniser.token.eof && i > indent) {
          tokeniser.skipToEOLorEOF();
          tokeniser.getNextToken();
          i = this._whitespace(tokeniser);
        }
        if (i > 0) return tokeniser.pushBackToken();
      } else if (tokeniser.token.slash) {
        haml._closeElements(indent, elementStack, tokeniser, generator);
        generator.outputBuffer.append(HamlRuntime.indentText(indent));
        generator.outputBuffer.append("<!--");
        tokeniser.getNextToken();
        contents = tokeniser.skipToEOLorEOF();
        if (contents && contents.length > 0) {
          generator.outputBuffer.append(contents);
        }
        if (contents && _(contents).startsWith('[') && contents.match(/\]\s*$/)) {
          elementStack[indent] = {
            htmlConditionalComment: true,
            eol: this._newline(tokeniser)
          };
          generator.outputBuffer.append(">");
        } else {
          elementStack[indent] = {
            htmlComment: true,
            eol: this._newline(tokeniser)
          };
        }
        if (haml._tagHasContents(indent, tokeniser)) {
          generator.outputBuffer.append("\n");
        }
        return tokeniser.getNextToken();
      }
    },
    _escapedLine: function(tokeniser, indent, elementStack, generator) {
      var contents;
      if (tokeniser.token.amp) {
        haml._closeElements(indent, elementStack, tokeniser, generator);
        generator.outputBuffer.append(HamlRuntime.indentText(indent));
        tokeniser.getNextToken();
        contents = tokeniser.skipToEOLorEOF();
        if (contents && contents.length > 0) {
          generator.outputBuffer.append(haml.HamlRuntime.escapeHTML(contents));
        }
        generator.outputBuffer.append(this._newline(tokeniser));
        return tokeniser.getNextToken();
      }
    },
    _ignoredLine: function(tokeniser, indent, elementStack, generator) {
      var contents;
      if (tokeniser.token.exclamation) {
        tokeniser.getNextToken();
        if (tokeniser.token.ws) indent += haml._whitespace(tokeniser);
        haml._closeElements(indent, elementStack, tokeniser, generator);
        contents = tokeniser.skipToEOLorEOF();
        return generator.outputBuffer.append(HamlRuntime.indentText(indent) + contents);
      }
    },
    _embeddedJs: function(tokeniser, indent, elementStack, tagOptions, generator) {
      var currentParsePoint, escapeHtml, expression, indentText, perserveWhitespace;
      if (elementStack) {
        haml._closeElements(indent, elementStack, tokeniser, generator);
      }
      if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml || tokeniser.token.tilde) {
        escapeHtml = tokeniser.token.escapeHtml || tokeniser.token.equal;
        perserveWhitespace = tokeniser.token.tilde;
        currentParsePoint = tokeniser.currentParsePoint();
        tokeniser.getNextToken();
        expression = tokeniser.skipToEOLorEOF();
        indentText = HamlRuntime.indentText(indent);
        if (!tagOptions || tagOptions.innerWhitespace) {
          generator.outputBuffer.append(indentText);
        }
        generator.appendEmbeddedCode(indentText, expression, escapeHtml, perserveWhitespace, currentParsePoint);
        if (!tagOptions || tagOptions.innerWhitespace) {
          generator.outputBuffer.append(this._newline(tokeniser));
          if (tokeniser.token.eol) return tokeniser.getNextToken();
        }
      }
    },
    _jsLine: function(tokeniser, indent, elementStack, generator) {
      var line;
      if (tokeniser.token.minus) {
        haml._closeElements(indent, elementStack, tokeniser, generator);
        tokeniser.getNextToken();
        line = tokeniser.skipToEOLorEOF();
        generator.setIndent(indent);
        generator.appendCodeLine(line, this._newline(tokeniser));
        if (tokeniser.token.eol) tokeniser.getNextToken();
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
    _templateLine: function(tokeniser, elementStack, indent, generator) {
      var attrList, attributesHash, classes, contents, currentParsePoint, hasContents, id, identifier, indentText, lineHasElement, objectRef, shouldInterpolate, tagOptions;
      if (!tokeniser.token.eol) {
        this._closeElements(indent, elementStack, tokeniser, generator);
      }
      identifier = this._element(tokeniser);
      id = this._idSelector(tokeniser);
      classes = this._classSelector(tokeniser);
      objectRef = this._objectReference(tokeniser);
      attrList = this._attributeList(tokeniser);
      currentParsePoint = tokeniser.currentParsePoint();
      attributesHash = this._attributeHash(tokeniser);
      tagOptions = {
        selfClosingTag: false,
        innerWhitespace: true,
        outerWhitespace: true
      };
      lineHasElement = this._lineHasElement(identifier, id, classes);
      if (tokeniser.token.slash) {
        tagOptions.selfClosingTag = true;
        tokeniser.getNextToken();
      }
      if (tokeniser.token.gt && lineHasElement) {
        tagOptions.outerWhitespace = false;
        tokeniser.getNextToken();
      }
      if (tokeniser.token.lt && lineHasElement) {
        tagOptions.innerWhitespace = false;
        tokeniser.getNextToken();
      }
      if (lineHasElement) {
        if (!tagOptions.selfClosingTag) {
          tagOptions.selfClosingTag = haml._isSelfClosingTag(identifier) && !haml._tagHasContents(indent, tokeniser);
        }
        this._openElement(currentParsePoint, indent, identifier, id, classes, objectRef, attrList, attributesHash, elementStack, tagOptions, generator);
      }
      hasContents = false;
      if (tokeniser.token.ws) tokeniser.getNextToken();
      if (tokeniser.token.equal || tokeniser.token.escapeHtml || tokeniser.token.unescapeHtml) {
        this._embeddedJs(tokeniser, indent + 1, null, tagOptions, generator);
        hasContents = true;
      } else {
        contents = '';
        shouldInterpolate = false;
        if (tokeniser.token.exclamation) {
          tokeniser.getNextToken();
          contents = tokeniser.skipToEOLorEOF();
        } else {
          contents = tokeniser.skipToEOLorEOF();
          if (contents.match(/^\\%/)) contents = contents.substring(1);
          shouldInterpolate = true;
        }
        hasContents = contents.length > 0;
        if (hasContents) {
          if (tagOptions.innerWhitespace && lineHasElement || (!lineHasElement && haml._parentInnerWhitespace(elementStack, indent))) {
            indentText = HamlRuntime.indentText(identifier.length > 0 ? indent + 1 : indent);
          } else {
            indentText = '';
            contents = _(contents).trim();
          }
          generator.appendTextContents(indentText + contents, shouldInterpolate, currentParsePoint);
          generator.outputBuffer.append(this._newline(tokeniser));
        }
        this._eolOrEof(tokeniser);
      }
      if (tagOptions.selfClosingTag && hasContents) {
        throw haml.HamlRuntime.templateError(currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine, "A self-closing tag can not have any contents");
      }
    },
    _attributeHash: function(tokeniser) {
      var attr;
      attr = '';
      if (tokeniser.token.attributeHash) {
        attr = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return attr;
    },
    _objectReference: function(tokeniser) {
      var attr;
      attr = '';
      if (tokeniser.token.objectReference) {
        attr = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return attr;
    },
    _attributeList: function(tokeniser) {
      var attr, attrList;
      attrList = {};
      if (tokeniser.token.openBracket) {
        tokeniser.getNextToken();
        while (!tokeniser.token.closeBracket) {
          attr = haml._attribute(tokeniser);
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
    _attribute: function(tokeniser) {
      var attr, name;
      attr = null;
      if (tokeniser.token.identifier) {
        name = tokeniser.token.tokenString;
        tokeniser.getNextToken();
        haml._whitespace(tokeniser);
        if (!tokeniser.token.equal) {
          throw tokeniser.parseError("Expected '=' after attribute name");
        }
        tokeniser.getNextToken();
        haml._whitespace(tokeniser);
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
    _closeElement: function(indent, elementStack, tokeniser, generator) {
      var innerWhitespace, outerWhitespace;
      if (elementStack[indent]) {
        generator.setIndent(indent);
        if (elementStack[indent].htmlComment) {
          generator.outputBuffer.append(HamlRuntime.indentText(indent) + '-->' + elementStack[indent].eol);
        } else if (elementStack[indent].htmlConditionalComment) {
          generator.outputBuffer.append(HamlRuntime.indentText(indent) + '<![endif]-->' + elementStack[indent].eol);
        } else if (elementStack[indent].block) {
          generator.closeOffCodeBlock(tokeniser);
        } else if (elementStack[indent].fnBlock) {
          generator.closeOffFunctionBlock(tokeniser);
        } else {
          innerWhitespace = !elementStack[indent].tagOptions || elementStack[indent].tagOptions.innerWhitespace;
          if (innerWhitespace) {
            generator.outputBuffer.append(HamlRuntime.indentText(indent));
          } else {
            generator.outputBuffer.trimWhitespace();
          }
          generator.outputBuffer.append('</' + elementStack[indent].tag + '>');
          outerWhitespace = !elementStack[indent].tagOptions || elementStack[indent].tagOptions.outerWhitespace;
          if (haml._parentInnerWhitespace(elementStack, indent) && outerWhitespace) {
            generator.outputBuffer.append('\n');
          }
        }
        elementStack[indent] = null;
        return generator.mark();
      }
    },
    _closeElements: function(indent, elementStack, tokeniser, generator) {
      var i, _results;
      i = elementStack.length - 1;
      _results = [];
      while (i >= indent) {
        _results.push(this._closeElement(i--, elementStack, tokeniser, generator));
      }
      return _results;
    },
    _openElement: function(currentParsePoint, indent, identifier, id, classes, objectRef, attributeList, attributeHash, elementStack, tagOptions, generator) {
      var element, parentInnerWhitespace, tagOuterWhitespace;
      element = identifier.length === 0 ? "div" : identifier;
      parentInnerWhitespace = this._parentInnerWhitespace(elementStack, indent);
      tagOuterWhitespace = !tagOptions || tagOptions.outerWhitespace;
      if (!tagOuterWhitespace) generator.outputBuffer.trimWhitespace();
      if (indent > 0 && parentInnerWhitespace && tagOuterWhitespace) {
        generator.outputBuffer.append(HamlRuntime.indentText(indent));
      }
      generator.outputBuffer.append('<' + element);
      if (attributeHash.length > 0 || objectRef.length > 0) {
        generator.generateCodeForDynamicAttributes(id, classes, attributeList, attributeHash, objectRef, currentParsePoint);
      } else {
        generator.outputBuffer.append(HamlRuntime.generateElementAttributes(null, id, classes, null, attributeList, null, currentParsePoint.lineNumber, currentParsePoint.characterNumber, currentParsePoint.currentLine));
      }
      if (tagOptions.selfClosingTag) {
        generator.outputBuffer.append("/>");
        if (tagOptions.outerWhitespace) return generator.outputBuffer.append("\n");
      } else {
        generator.outputBuffer.append(">");
        elementStack[indent] = {
          tag: element,
          tagOptions: tagOptions
        };
        if (tagOptions.innerWhitespace) return generator.outputBuffer.append("\n");
      }
    },
    _isSelfClosingTag: function(tag) {
      return tag === 'meta' || tag === 'img' || tag === 'link' || tag === 'script' || tag === 'br' || tag === 'hr';
    },
    _tagHasContents: function(indent, tokeniser) {
      var nextToken;
      if (!tokeniser.isEolOrEof()) {
        return true;
      } else {
        nextToken = tokeniser.lookAhead(1);
        return nextToken.ws && nextToken.tokenString.length / 2 > indent;
      }
    },
    _parentInnerWhitespace: function(elementStack, indent) {
      return indent === 0 || (!elementStack[indent - 1] || !elementStack[indent - 1].tagOptions || elementStack[indent - 1].tagOptions.innerWhitespace);
    },
    _lineHasElement: function(identifier, id, classes) {
      return identifier.length > 0 || id.length > 0 || classes.length > 0;
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
    _whitespace: function(tokeniser) {
      var indent;
      indent = 0;
      if (tokeniser.token.ws) {
        indent = tokeniser.token.tokenString.length / 2;
        tokeniser.getNextToken();
      }
      return indent;
    },
    _element: function(tokeniser) {
      var identifier;
      identifier = '';
      if (tokeniser.token.element) {
        identifier = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return identifier;
    },
    _eolOrEof: function(tokeniser) {
      if (tokeniser.token.eol || tokeniser.token.continueLine) {
        return tokeniser.getNextToken();
      } else if (!tokeniser.token.eof) {
        throw tokeniser.parseError("Expected EOL or EOF");
      }
    },
    _idSelector: function(tokeniser) {
      var id;
      id = '';
      if (tokeniser.token.idSelector) {
        id = tokeniser.token.tokenString;
        tokeniser.getNextToken();
      }
      return id;
    },
    _classSelector: function(tokeniser) {
      var classes;
      classes = [];
      while (tokeniser.token.classSelector) {
        classes.push(tokeniser.token.tokenString);
        tokeniser.getNextToken();
      }
      return classes;
    },
    _newline: function(tokeniser) {
      if (tokeniser.token.eol) {
        return tokeniser.token.matched;
      } else if (tokeniser.token.continueLine) {
        return tokeniser.token.matched.substring(1);
      } else {
        return "\n";
      }
    }
  };

  root.haml.Tokeniser = Tokeniser;

  root.haml.Buffer = Buffer;

  root.haml.JsCodeGenerator = JsCodeGenerator;

  root.haml.CoffeeCodeGenerator = CoffeeCodeGenerator;

  root.haml.HamlRuntime = HamlRuntime;

  root.haml.filters = filters;

}).call(this);
