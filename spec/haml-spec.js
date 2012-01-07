(function() {
  var isIe7or8;

  isIe7or8 = function() {
    var re, result, ua;
    result = false;
    if (navigator.appName === 'Microsoft Internet Explorer') {
      ua = navigator.userAgent;
      re = new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");
      if (re.exec(ua) !== null) result = parseFloat(RegExp.$1) < 9.0;
    }
    return result;
  };

  beforeEach(function() {
    haml.cache = {};
    return this.addMatchers({
      toThrowContaining: function(expected) {
        var exception, isnot, result, _ref;
        result = false;
        if (typeof this.actual !== 'function') {
          throw new Error('Actual is not a function');
        }
        try {
          this.actual();
        } catch (e) {
          exception = e;
        }
        if (exception != null) {
          result = exception.toString().indexOf(expected) >= 0;
        }
        isnot = (_ref = this.isNot) != null ? _ref : {
          "not ": ""
        };
        this.message = function() {
          if (exception) {
            return ["Expected function " + isnot + "to throw something with ", expected, ", but it threw", exception].join(' ');
          } else {
            return "Expected function to throw an exception.";
          }
        };
        return result;
      }
    });
  });

  describe('haml', function() {
    describe('empty template', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/haml-template" id="empty"></script>');
      });
      it('should return an empty string', function() {
        return expect(haml.compileHaml('empty')()).toEqual('');
      });
      it('should return an empty string from empty string', function() {
        return expect(haml.compileStringToJs('')()).toEqual('');
      });
      it('with coffescript should return an empty string', function() {
        return expect(haml.compileCoffeeHaml('empty')()).toEqual('');
      });
      return it('with coffescript string should return an empty string', function() {
        return expect(haml.compileCoffeeHamlFromString('')()).toEqual('');
      });
    });
    describe('simple template', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="simple">\n' + '%h1\n' + '  %div\n' + '    %p\n' + '    %span</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('simple')();
        return expect(html).toEqual('<h1>\n' + '  <div>\n' + '    <p>\n' + '    </p>\n' + '    <span>\n' + '    </span>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('invalid template', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="invalid">%h1\n' + '  %h2\n' + '    %h3{%h3 %h4}\n' + '      %h4\n' + '        %h5</script>' + '<script type="text/template" id="invalid2">%h1\n' + '  %h2\n' + '    %h3{id: "test", class: "test-class"\n' + '      %h4\n' + '        %h5</script>' + '<script type="text/template" id="invalid3">' + '%a#back(href="#" class="button back)\n' + '%span Back\n' + '%a#continue(href="#" class="button continue")\n' + '%span Save and Continue\n' + '</script>');
      });
      return it('should provide a meaningful message', function() {
        var line;
        line = isIe7or8() ? '4' : '3';
        expect(function() {
          return haml.compileHaml('invalid')();
        }).toThrowContaining('at line ' + line + ' and character 16:\n' + '    %h3{%h3 %h4}\n' + '---------------^');
        expect(function() {
          return haml.compileHaml('invalid2');
        }).toThrowContaining('at line ' + line + ' and character 8:\n' + '    %h3{id: "test", class: "test-class"\n' + '-------^');
        return expect(function() {
          return haml.compileHaml('invalid3');
        }).toThrowContaining('Expected a quoted string or an identifier for the attribute value');
      });
    });
    describe('simple template with text', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="simple">\n' + '%h1\n' + '  %div\n' + '    %p This is some text\n' + '      This is some text\n' + '    This is some <div> text\n' + '    \\%span\n' + '    %span %h1 %h1 %h1</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('simple')();
        return expect(html).toEqual('<h1>\n' + '  <div>\n' + '    <p>\n' + '      This is some text\n' + '      This is some text\n' + '    </p>\n' + '    This is some <div> text\n' + '    %span\n' + '    <span>\n' + '      %h1 %h1 %h1\n' + '    </span>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('template with {} attributes', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="attributes">\n' + '%h1\n' + '  %div{id: "test"}\n' + '    %p{id: \'test2\', ' + '        class: "blah", name: null, test: false, checked: false, selected: true} This is some text\n' + '      This is some text\n' + '    This is some div text\n' + '    %label(for = "a"){for: ["b", "c"]}/\n' + '    %div{id: [\'test\', 1], class: [model.name, "class2"], for: "something"}\n' + '</script>\n' + '<script type="text/template" id="coffee-attributes">\n' + '%h1\n' + '  %div{id: "test"}\n' + '    %p{id: \'test2\', ' + '        class: "blah", name: null, test: false, checked: false, selected: true} This is some text\n' + '      This is some text\n' + '    This is some div text\n' + '    %label(for = "a"){for: ["b", "c"]}/\n' + '    %div{id: [\'test\', 1], class: [@model.name, "class2"], for: "something"}\n' + '</script>');
      });
      it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('attributes')({
          model: {
            name: 'class1'
          }
        });
        return expect(html).toEqual('<h1>\n' + '  <div id="test">\n' + '    <p id="test2" class="blah" selected="selected">\n' + '      This is some text\n' + '      This is some text\n' + '    </p>\n' + '    This is some div text\n' + '    <label for="a-b-c"/>\n' + '    <div id="test-1" class="class1 class2" for="something">\n' + '    </div>\n' + '  </div>\n' + '</h1>\n');
      });
      return it('with coffescript should render the correct html', function() {
        var html;
        html = haml.compileCoffeeHaml('coffee-attributes').call({
          model: {
            name: 'class1'
          }
        });
        return expect(html).toEqual('<h1>\n' + '  <div id="test">\n' + '    <p id="test2" class="blah" selected="selected">\n' + '      This is some text\n' + '      This is some text\n' + '    </p>\n' + '    This is some div text\n' + '    <label for="a-b-c"/>\n' + '    <div id="test-1" class="class1 class2" for="something">\n' + '    </div>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('template with () attributes', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="attributes">\n' + '%h1\n' + '  %div(id = "test")\n' + '    %p(id=test2 class="blah"\n selected="selected") This is some text\n' + '      This is some text\n' + '    This is some div text\n' + '    %div(id=test){id: 1, class: [model.name, "class2"]}\n' + '    %a(href="#" data-key="MOD_DESC")/' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('attributes')({
          model: {
            name: 'class1'
          }
        });
        return expect(html).toEqual('<h1>\n' + '  <div id="test">\n' + '    <p id="test2" class="blah" selected="selected">\n' + '      This is some text\n' + '      This is some text\n' + '    </p>\n' + '    This is some div text\n' + '    <div id="test-1" class="class1 class2">\n' + '    </div>\n' + '    <a href="#" data-key="MOD_DESC"/>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('template with id and class selectors', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="attributes">\n' + '%h1\n' + '  #test.test\n' + '    %p#test.blah{id: 2, class: "test"} This is some text\n' + '      This is some text\n' + '    This is some div text\n' + '    .class1.class2/\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('attributes')();
        return expect(html).toEqual('<h1>\n' + '  <div id="test" class="test">\n' + '    <p id="test-2" class="blah test">\n' + '      This is some text\n' + '      This is some text\n' + '    </p>\n' + '    This is some div text\n' + '    <div class="class1 class2"/>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('template with self-closing tags', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="self-closing-tags">\n' + '%div\n' + '  meta, img, link, script, br, and hr\n' + '  %meta\n' + '  %meta/\n' + '  %meta\n' + '    meta\n' + '  %img\n' + '  %img/\n' + '  %img\n' + '    img\n' + '  %link\n' + '  %link/\n' + '  %link\n' + '    link\n' + '  %br\n' + '  %br/\n' + '  %br\n' + '    br/\n' + '  %hr\n' + '  %hr/\n' + '  %hr\n' + '    hr\n' + '  %div/\n' + '  %p/\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('self-closing-tags')({});
        return expect(html).toEqual('<div>\n' + '  meta, img, link, script, br, and hr\n' + '  <meta/>\n' + '  <meta/>\n' + '  <meta>\n' + '    meta\n' + '  </meta>\n' + '  <img/>\n' + '  <img/>\n' + '  <img>\n' + '    img\n' + '  </img>\n' + '  <link/>\n' + '  <link/>\n' + '  <link>\n' + '    link\n' + '  </link>\n' + '  <br/>\n' + '  <br/>\n' + '  <br>\n' + '    br/\n' + '  </br>\n' + '  <hr/>\n' + '  <hr/>\n' + '  <hr>\n' + '    hr\n' + '  </hr>\n' + '  <div/>\n' + '  <p/>\n' + '</div>\n');
      });
    });
    describe('template with unescaped HTML', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="unescaped">\n' + '%h1 !<div>\n' + '  !#test.test\n' + '    !%p#test.blah{id: 2, class: "test"} This is some text\n' + '      !This is some text\n' + '!    This is some <div> text\n' + '!    <div class="class1 class2"></div>\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('unescaped')();
        return expect(html).toEqual('<h1>\n' + '  <div>\n' + '  #test.test\n' + '    %p#test.blah{id: 2, class: "test"} This is some text\n' + '      This is some text\n' + '    This is some <div> text\n' + '    <div class="class1 class2"></div>\n' + '</h1>\n');
      });
    });
    describe('template with Javascript evaluation', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="evaluation">\n' + '.box.error\n' + '  %span\n' + '    = errorTitle\n' + '  .clear\n' + '    %span= errorHeading\n' + '    = var label = "Calculation: "; label + (1 + 2 * 3)\n' + '    = ["hi", "there", "reader!"]\n' + '    = evilScript \n' + '    %span&= errorHeading\n' + '    &= var label = "Calculation: "; label + (1 + 2 * 3)\n' + '    &= ["hi", "there", "reader!"]\n' + '    &= evilScript \n' + '    %span!= errorHeading\n' + '    != var label = "Calculation: "; label + (1 + 2 * 3)\n' + '    != ["hi", "there", "reader!"]\n' + '    != evilScript \n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('evaluation')({
          errorTitle: "Error Title",
          errorHeading: "Error Heading <div>div text</div>",
          evilScript: '<script>alert("I\'m evil!");</script>'
        });
        return expect(html).toEqual('<div class="box error">\n' + '  <span>\n' + '    Error Title\n' + '  </span>\n' + '  <div class="clear">\n' + '    <span>\n' + '      Error Heading &lt;div&gt;div text&lt;/div&gt;\n' + '    </span>\n' + '    Calculation: 7\n' + '    hi,there,reader!\n' + '    &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);&lt;/script&gt;\n' + '    <span>\n' + '      Error Heading &lt;div&gt;div text&lt;/div&gt;\n' + '    </span>\n' + '    Calculation: 7\n' + '    hi,there,reader!\n' + '    &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);&lt;/script&gt;\n' + '    <span>\n' + '      Error Heading <div>div text</div>\n' + '    </span>\n' + '    Calculation: 7\n' + '    hi,there,reader!\n' + '    <script>alert("I\'m evil!");</script>\n' + '  </div>\n' + '</div>\n');
      });
    });
    describe('template with Coffee evaluation', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="evaluation">\n' + '.box.error\n' + '  %span\n' + '    = @errorTitle\n' + '  .clear\n' + '    %span= @errorHeading\n' + '    = label = "Calculation: "; label + (1 + 2 * 3)\n' + '    = ["hi", "there", "reader!"]\n' + '    = @evilScript \n' + '    %span&= @errorHeading\n' + '    &= label = "Calculation: "; label + (1 + 2 * 3)\n' + '    &= ["hi", "there", "reader!"]\n' + '    &= @evilScript \n' + '    %span!= @errorHeading\n' + '    != label = "Calculation: "; label + (1 + 2 * 3)\n' + '    != ["hi", "there", "reader!"]\n' + '    != @evilScript \n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileCoffeeHaml('evaluation').call({
          errorTitle: "Error Title",
          errorHeading: "Error Heading <div>div text</div>",
          evilScript: '<script>alert("I\'m evil!");</script>'
        });
        return expect(html).toEqual('<div class="box error">\n' + '  <span>\n' + '    Error Title\n' + '  </span>\n' + '  <div class="clear">\n' + '    <span>\n' + '      Error Heading &lt;div&gt;div text&lt;/div&gt;\n' + '    </span>\n' + '    Calculation: 7\n' + '    hi,there,reader!\n' + '    &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);&lt;/script&gt;\n' + '    <span>\n' + '      Error Heading &lt;div&gt;div text&lt;/div&gt;\n' + '    </span>\n' + '    Calculation: 7\n' + '    hi,there,reader!\n' + '    &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);&lt;/script&gt;\n' + '    <span>\n' + '      Error Heading <div>div text</div>\n' + '    </span>\n' + '    Calculation: 7\n' + '    hi,there,reader!\n' + '    <script>alert("I\'m evil!");</script>\n' + '  </div>\n' + '</div>\n');
      });
    });
    describe('template with Javascript code lines', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="evaluation">\n' + '.main\n' + '  - var foo = "hello";\n' + '  - foo += " world";\n' + '  %span\n' + '    = foo\n' + '</script>\n' + '<script type="text/template" id="evaluation-with-loops">\n' + '.main\n' + '  - _(["Option 1", "Option 2", "Option 3"]).each(function (option) {\n' + '    %span= option\n' + '  - });\n' + '  - for (var i = 0; i < 5; i++) {\n' + '    %p= i\n' + '  - }\n' + '</script>' + '<script type="text/template" id="evaluation-using-context">\n' + '.main\n' + '  - var foo = model.foo;\n' + '  - foo += " world";\n' + '  %span\n' + '    = foo\n' + '</script>' + '<script type="text/template" id="attribute-hash-evaluation-using-outer-scope">\n' + '.main\n' + '  - var foo = "hello world";\n' + '  %span{someattribute: foo}\n' + '</script>');
      });
      it('should render the correct html using locally defined variables', function() {
        var html;
        html = haml.compileHaml('evaluation')();
        return expect(html).toEqual('<div class="main">\n' + '  <span>\n' + '    hello world\n' + '  </span>\n' + '</div>\n');
      });
      it('should render the correct html when the template has loops', function() {
        var html;
        html = haml.compileHaml('evaluation-with-loops')();
        return expect(html).toEqual('<div class="main">\n' + '    <span>\n' + '      Option 1\n' + '    </span>\n' + '    <span>\n' + '      Option 2\n' + '    </span>\n' + '    <span>\n' + '      Option 3\n' + '    </span>\n' + '    <p>\n' + '      0\n' + '    </p>\n' + '    <p>\n' + '      1\n' + '    </p>\n' + '    <p>\n' + '      2\n' + '    </p>\n' + '    <p>\n' + '      3\n' + '    </p>\n' + '    <p>\n' + '      4\n' + '    </p>\n' + '</div>\n');
      });
      it('should provide access to the context within inline javascript', function() {
        var html, model;
        model = {
          foo: "hello"
        };
        html = haml.compileHaml('evaluation-using-context').call(null, {
          model: model
        });
        return expect(html).toEqual('<div class="main">\n' + '  <span>\n' + '    hello world\n' + '  </span>\n' + '</div>\n');
      });
      return it('should be able to access variables declared as part of the haml', function() {
        var html, model;
        model = {
          foo: "hello"
        };
        html = haml.compileHaml('attribute-hash-evaluation-using-outer-scope').call(null, {
          model: model
        });
        return expect(html).toEqual('<div class="main">\n' + '  <span someattribute="hello world">\n' + '  </span>\n' + '</div>\n');
      });
    });
    describe('template with Coffeescript code lines', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="evaluation">\n' + '.main\n' + '  - foo = "hello"\n' + '  - foo += " world"\n' + '  %span\n' + '    %span/\n' + '      %span/\n' + '    = foo\n' + '</script>\n' + '<script type="text/template" id="evaluation-with-loops">\n' + '.main\n' + '  - for option in ["Option 1", "Option 2", "Option 3"]\n' + '    %span= option\n' + '  - for i in [0...5]\n' + '    %p= i\n' + '</script>' + '<script type="text/template" id="evaluation-using-context">\n' + '.main\n' + '  - foo = @model.foo\n' + '  - foo += " world"\n' + '  %span\n' + '    = foo\n' + '</script>' + '<script type="text/template" id="attribute-hash-evaluation-using-outer-scope">\n' + '.main\n' + '  - foo = "hello world"\n' + '  %span{someattribute: foo}\n' + '</script>');
      });
      it('should render the correct html using locally defined variables', function() {
        var html;
        html = haml.compileCoffeeHaml('evaluation')();
        return expect(html).toEqual('<div class="main">\n' + '  <span>\n' + '    <span/>\n' + '      <span/>\n' + '    hello world\n' + '  </span>\n' + '</div>\n');
      });
      it('should render the correct html when the template has loops', function() {
        var html;
        html = haml.compileCoffeeHaml('evaluation-with-loops')();
        return expect(html).toEqual('<div class="main">\n' + '    <span>\n' + '      Option 1\n' + '    </span>\n' + '    <span>\n' + '      Option 2\n' + '    </span>\n' + '    <span>\n' + '      Option 3\n' + '    </span>\n' + '    <p>\n' + '      0\n' + '    </p>\n' + '    <p>\n' + '      1\n' + '    </p>\n' + '    <p>\n' + '      2\n' + '    </p>\n' + '    <p>\n' + '      3\n' + '    </p>\n' + '    <p>\n' + '      4\n' + '    </p>\n' + '</div>\n');
      });
      it('should provide access to the context within inline javascript', function() {
        var html, model;
        model = {
          foo: "hello"
        };
        html = haml.compileCoffeeHaml('evaluation-using-context').call({
          model: model
        });
        return expect(html).toEqual('<div class="main">\n' + '  <span>\n' + '    hello world\n' + '  </span>\n' + '</div>\n');
      });
      return it('should be able to access variables declared as part of the haml', function() {
        var html, model;
        model = {
          foo: "hello"
        };
        html = haml.compileCoffeeHaml('attribute-hash-evaluation-using-outer-scope').call({
          model: model
        });
        return expect(html).toEqual('<div class="main">\n' + '  <span someattribute="hello world">\n' + '  </span>\n' + '</div>\n');
      });
    });
    describe('template with comments', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="comments">\n' + '.main\n' + '  / This is a comment\n' + '  /\n' + '    %span\n' + '      = errorTitle\n' + '  -# .clear\n' + '      %span= errorHeading\n' + '  -#  = var label = "Calculation: "; return label + (1 + 2 * 3)\n' + '  -#  = ["hi", "there", "reader!"]\n' + '  -#  = evilScript \n' + '  /[if IE]  \n' + '    %a(href = "http://www.mozilla.com/en-US/firefox/" )\n' + '      %h1 Get Firefox\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('comments')({
          errorTitle: "An error's a terrible thing"
        });
        return expect(html).toEqual('<div class="main">\n' + '  <!-- This is a comment  -->\n' + '  <!--\n' + '    <span>\n' + '      An error&#39;s a terrible thing\n' + '    </span>\n' + '  -->\n' + '  <!--[if IE]  >\n' + '    <a href="http://www.mozilla.com/en-US/firefox/">\n' + '      <h1>\n' + '        Get Firefox\n' + '      </h1>\n' + '    </a>\n' + '  <![endif]-->\n' + '</div>\n');
      });
    });
    describe('template with Javascript code lines and no closing blocks', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="evaluation-with-loops">\n' + '.main\n' + '  - _(["Option 1", "Option 2", "Option 3"]).each(function (option) {\n' + '    %span= option\n' + '  - for (var i = 0; i < 5; i++) {\n' + '    %p= i\n' + '</script>');
      });
      return it('should render the correct html when the template has loops', function() {
        var html;
        html = haml.compileHaml('evaluation-with-loops')();
        return expect(html).toEqual('<div class="main">\n' + '    <span>\n' + '      Option 1\n' + '    </span>\n' + '    <span>\n' + '      Option 2\n' + '    </span>\n' + '    <span>\n' + '      Option 3\n' + '    </span>\n' + '    <p>\n' + '      0\n' + '    </p>\n' + '    <p>\n' + '      1\n' + '    </p>\n' + '    <p>\n' + '      2\n' + '    </p>\n' + '    <p>\n' + '      3\n' + '    </p>\n' + '    <p>\n' + '      4\n' + '    </p>\n' + '</div>\n');
      });
    });
    describe('Escaping HTML', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="simple">' + '.main\n' + '  <div>\n' + '    &  <p>\n' + '    &  </p>\n' + '    &  <span>\n' + '    &    <script>alert("I\'m evil!");\n' + '    &  </span>\n' + '  </div>\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('simple')();
        return expect(html).toEqual('<div class="main">\n' + '  <div>\n' + '      &lt;p&gt;\n' + '      &lt;/p&gt;\n' + '      &lt;span&gt;\n' + '        &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);\n' + '      &lt;/span&gt;\n' + '  </div>\n' + '</div>\n');
      });
    });
    describe('Issue #2 - Anonymous functions should pass through \'this\'', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="anonymous">\n' + '.test = this.fnOnThis()\n' + '.test2 = fnOnThis()\n' + '</script>');
      });
      return it('should the correct html', function() {
        var context, html, that;
        that = {
          fnOnThis: function() {
            return 'TEST';
          }
        };
        context = {
          fnOnThis: function() {
            return 'TEST2';
          }
        };
        html = haml.compileHaml('anonymous').call(that, context);
        return expect(html).toEqual('<div class="test">\n' + '  TEST\n' + '</div>\n' + '<div class="test2">\n' + '  TEST2\n' + '</div>\n');
      });
    });
    describe('Issue #6 - Empty lines should be ignored', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="empty-lines">\n' + '%div\n' + '  %div\n' + '    %div\n' + '    \n' + '    %div\n' + '  \n' + '    %div' + '\n' + '    %div' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('empty-lines')();
        return expect(html).toEqual('<div>\n' + '  <div>\n' + '    <div>\n' + '    \n' + '    </div>\n' + '    <div>\n' + '  \n' + '    </div>\n' + '    <div>\n' + '    </div>\n' + '    <div>\n' + '    </div>\n' + '  </div>\n' + '</div>\n');
      });
    });
    describe('Issue #14 - rendering null values', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="null-js-values">\n' + '.inline-null\n' + '  = null;\n' + '.null-evaluating\n' + '  = nullValue;\n' + '.embedded-null= null\n' + '</script>');
      });
      return it('should render null values as a string', function() {
        var html;
        html = haml.compileHaml('null-js-values')({
          nullValue: null
        });
        return expect(html).toEqual('<div class="inline-null">\n' + '  \n' + '</div>\n' + '<div class="null-evaluating">\n' + '  \n' + '</div>\n' + '<div class="embedded-null">\n' + '  \n' + '</div>\n');
      });
    });
    describe('Whitespace Removal: > and <', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="whitespace-removal">\n' + '%blockquote<\n' + '  %div\n' + '    Foo!\n' + '%img\n' + '%img>\n' + '%img\n' + '%p<= "Foo\\nBar"\n' + '%img\n' + '%pre><\n' + '  foo\n' + '  bar\n' + '%img\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('whitespace-removal')();
        return expect(html).toEqual('<blockquote><div>\n' + '    Foo!\n' + '  </div></blockquote>\n' + '<img/><img/><img/>\n' + '<p>Foo\n' + 'Bar</p>\n' + '<img/><pre>foo\n' + 'bar</pre><img/>\n');
      });
    });
    describe('template with object reference', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="object-reference">\n' + '%h1\n' + '  %div[test]\n' + '    %p[test2] This is some text\n' + '      This is some text\n' + '    This is some div text\n' + '    .class1[test3]{id: 1, class: "class3", for: "something"}\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('object-reference')({
          test: {
            id: 'test'
          },
          test2: {
            id: 'test2',
            'class': 'blah'
          },
          test3: {
            attributes: {
              id: 'test',
              'class': 'class2'
            },
            get: function(name) {
              return this.attributes[name];
            }
          }
        });
        return expect(html).toEqual('<h1>\n' + '  <div id="test">\n' + '    <p id="test2" class="blah">\n' + '      This is some text\n' + '      This is some text\n' + '    </p>\n' + '    This is some div text\n' + '    <div class="class1 class2 class3" id="test-1" for="something">\n' + '    </div>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('coffescript template with object reference', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="object-reference">\n' + '%h1\n' + '  %div[@test]\n' + '    %p[@test2] This is some text\n' + '      This is some text\n' + '    This is some div text\n' + '    .class1[@test3]{id: 1, class: "class3", for: "something"}\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileCoffeeHaml('object-reference').call({
          test: {
            id: 'test'
          },
          test2: {
            id: 'test2',
            'class': 'blah'
          },
          test3: {
            attributes: {
              id: 'test',
              'class': 'class2'
            },
            get: function(name) {
              return this.attributes[name];
            }
          }
        });
        return expect(html).toEqual('<h1>\n' + '  <div id="test">\n' + '    <p id="test2" class="blah">\n' + '      This is some text\n' + '      This is some text\n' + '    </p>\n' + '    This is some div text\n' + '    <div class="class1 class2 class3" id="test-1" for="something">\n' + '    </div>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('html 5 data attributes', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="html5-attributes">\n' + '%h1\n' + '  %div{id: "test"}\n' + '    %p{id: \'test2\', data: {\n' + '        class: "blah", name: null, test: false, checked: false, selected: true}} This is some text\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('html5-attributes')();
        return expect(html).toEqual('<h1>\n' + '  <div id="test">\n' + '    <p id="test2" data-class="blah" data-selected="true">\n' + '      This is some text\n' + '    </p>\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('without template', function() {
      return it('should render the correct html', function() {
        return expect(haml.compileStringToJs("%div")()).toEqual('<div>\n</div>\n');
      });
    });
    describe('whitespace preservation', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="whitespace-preservation">\n' + '%h1\n' + '  %div\n' + '    ~ "Foo\\n<pre>Bar\\nBaz</pre>\\n<a>Test\\nTest\\n</a>\\nOther"\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('whitespace-preservation')();
        return expect(html).toEqual('<h1>\n' + '  <div>\n' + '    Foo\n' + '<pre>Bar&#x000A;Baz</pre>\n' + '<a>Test&#x000A;Test&#x000A;</a>\n' + 'Other\n' + '  </div>\n' + '</h1>\n');
      });
    });
    describe('doctype', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="doctype">\n' + '!!! XML\n' + '!!! XML iso-8859-1\n' + '!!!\n' + '!!! 1.1\n' + '%html\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('doctype')();
        return expect(html).toEqual('<?xml version=\'1.0\' encoding=\'utf-8\' ?>\n' + '<?xml version=\'1.0\' encoding=\'iso-8859-1\' ?>\n' + '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' + '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n' + '<html>\n</html>\n');
      });
    });
    describe('Issue 13 - comments', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="comment-issue">\n' + '#div1\n' + '  -# if blahDiBlah\n' + '    #shouldNotRender\n' + '      .shouldAlsoNotRender\n' + '        You should not see me\n' + '  You should see me\n' + '-# #div2\n' + '  I\'m Invisible!\n' + '#div3\n' + '  You should see me\n' + '</script>');
      });
      return it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('comment-issue')();
        return expect(html).toEqual('<div id="div1">\n' + '  You should see me\n' + '</div>\n' + '<div id="div3">\n' + '  You should see me\n' + '</div>\n');
      });
    });
    return describe('Multiline code blocks', function() {
      beforeEach(function() {
        return setFixtures('<script type="text/template" id="multiline">\n' + '%whoo\n' + '  %hoo=                           |\n' + '    "I think this might get " +   |\n' + '    "pretty long so I should " +  |\n' + '    "probably make it " +         |\n' + '    "multiline so it doesn\'t " + |\n' + '    "look awful."                 |\n' + '  %p This is short.\n' + '</script>');
      });
      it('should render the correct html', function() {
        var html;
        html = haml.compileHaml('multiline')();
        return expect(html).toEqual('<whoo>\n' + '  <hoo>\n' + '    I think this might get pretty long so I should probably make it multiline so it doesn&#39;t look awful.\n' + '  </hoo>\n' + '  <p>\n' + '    This is short.\n' + '  </p>\n' + '</whoo>\n');
      });
      return it('with coffescript should render the correct html', function() {
        var html;
        html = haml.compileCoffeeHaml('multiline')();
        return expect(html).toEqual('<whoo>\n' + '  <hoo>\n' + '    I think this might get pretty long so I should probably make it multiline so it doesn&#39;t look awful.\n' + '  </hoo>\n' + '  <p>\n' + '    This is short.\n' + '  </p>\n' + '</whoo>\n');
      });
    });
  });

  describe('filters', function() {
    beforeEach(function() {
      return setFixtures('<script type="text/template" id="plain-filter">\n%h1\n  %p\n    :plain\n      Does not parse the filtered text. This is useful for large blocks of text without HTML tags,\n      when you don\'t want lines starting with . or - to be parsed.\n  %span Other Contents\n</script>');
    });
    it('should render the result of the filter function', function() {
      var html;
      html = haml.compileHaml('plain-filter')();
      return expect(html).toEqual('<h1>\n  <p>\n    Does not parse the filtered text. This is useful for large blocks of text without HTML tags,\n    when you don\'t want lines starting with . or - to be parsed.\n  </p>\n  <span>\n    Other Contents\n  </span>\n</h1>\n');
    });
    it('should raise an error if the filter is not found', function() {
      return expect(function() {
        return haml.compileStringToJs('%p\n  :unknown\n    blah di blah di blah');
      }).toThrow('Filter \'unknown\' not registered. Filter functions need to be added to \'haml.filters\'. at line 2 and character 10:\n  :unknown\n---------^');
    });
    it('generates javascript filters correctly', function() {
      return expect(haml.compileCoffeeHamlFromString('%body\n  :javascript\n    // blah di blah di blah\n    function () {\n      return \'blah\';\n    }')()).toEqual('<body>\n  <script type="text/javascript">\n  //<![CDATA[\n  // blah di blah di blah\n  function () {\n    return \'blah\';\n  }\n  //]]>\n  </script>\n</body>\n');
    });
    it('generates css filters correctly', function() {
      return expect(haml.compileStringToJs('%head\n  :css\n    /* blah di blah di blah */\n    .body {\n      color: red;\n    }')()).toEqual('<head>\n  <style type="text/css">\n  /*<![CDATA[*/\n  /* blah di blah di blah */\n  .body {\n    color: red;\n  }\n  /*]]>*/\n  </style>\n</head>\n');
    });
    it('generates CDATA filters correctly', function() {
      return expect(haml.compileStringToJs('%body\n  :cdata\n    // blah di blah di blah\n    function () {\n      return \'blah\';\n    }')()).toEqual('<body>\n  <![CDATA[\n  // blah di blah di blah\n  function () {\n    return \'blah\';\n  }\n  ]]>\n</body>\n');
    });
    return it('generates preserve filters correctly', function() {
      return expect(haml.compileStringToJs('%p\n  :preserve\n    Foo\n    <pre>Bar\n    Baz</pre>\n    <a>Test\n    Test\n    </a>\n    Other')()).toEqual('<p>\nFoo\n<pre>Bar&#x000A;Baz</pre>\n<a>Test&#x000A;Test&#x000A;</a>\nOther\n</p>\n');
    });
  });

}).call(this);
