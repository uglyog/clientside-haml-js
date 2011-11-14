/*global haml */

var isIe7or8 = function() {
  if (navigator.appName === 'Microsoft Internet Explorer') {
    var ua = navigator.userAgent;
    var re = new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");
    if (re.exec(ua) !== null) {
      return parseFloat(RegExp.$1) < 9.0;
    }
  }
  return false;
};

describe('haml', function () {

  beforeEach(function () {
    haml.cache = {};
    this.addMatchers({
      toThrowContaining: function (expected) {
        var result = false;
        var exception;
        if (typeof this.actual !== 'function') {
          throw new Error('Actual is not a function');
        }
        try {
          this.actual();
        } catch (e) {
          exception = e;
        }
        if (exception) {
          result = exception.toString().indexOf(expected) >= 0;
        }

        var not = this.isNot ? "not " : "";

        this.message = function () {
          if (exception) {
            return ["Expected function " + not + "to throw something with ", expected, ", but it threw", exception].join(' ');
          } else {
            return "Expected function to throw an exception.";
          }
        };

        return result;
      }
    });
  });

  describe('empty template', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="empty"></script>');
    });

    it('should return an empty string', function () {
      expect(haml.compileHaml('empty').call(null, {})).toEqual('');
    });
  });

  describe('simple template', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="simple">\n' +
        '%h1\n' +
        '  %div\n' +
        '    %p\n' +
        '    %span</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('simple').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div>\n' +
        '    <p>\n' +
        '    </p>\n' +
        '    <span>\n' +
        '    </span>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('invalid template', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="invalid">%h1\n' +
        '  %h2\n' +
        '    %h3{%h3 %h4}\n' +
        '      %h4\n' +
        '        %h5</script>' +
        '<script type="text/template" id="invalid2">%h1\n' +
        '  %h2\n' +
        '    %h3{id: "test", class: "test-class"\n' +
        '      %h4\n' +
        '        %h5</script>' +
        '<script type="text/template" id="invalid3">' +
        '%a#back(href="#" class="button back)\n' +
        '%span Back\n' +
        '%a#continue(href="#" class="button continue")\n' +
        '%span Save and Continue\n' +
        '</script>'
      );
    });

    it('should provide a meaningful message', function () {
      // IE 7 and 8 add an extra newline at the start of the script contents
      var line = isIe7or8() ? '4' : '3';
      expect(function () {
        haml.compileHaml('invalid').call(null, {});
      }).toThrowContaining('at line ' + line + ' and character 16:\n' +
          '    %h3{%h3 %h4}\n' +
          '---------------^');
      expect(function () {
        haml.compileHaml('invalid2');
      }).toThrowContaining('at line ' + line + ' and character 8:\n' +
        '    %h3{id: "test", class: "test-class"\n' +
        '-------^');
      expect(function () {
        haml.compileHaml('invalid3');
      }).toThrowContaining('Expected a quoted string or an identifier for the attribute value');
    });

  });

  describe('simple template with text', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="simple">\n' +
        '%h1\n' +
        '  %div\n' +
        '    %p This is some text\n' +
        '      This is some text\n' +
        '    This is some <div> text\n' +
        '    \\%span\n' +
        '    %span %h1 %h1 %h1</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('simple').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
          '  <div>\n' +
          '    <p>\n' +
          '      This is some text\n' +
          '      This is some text\n' +
          '    </p>\n' +
          '    This is some <div> text\n' +
          '    %span\n' +
          '    <span>\n' +
          '      %h1 %h1 %h1\n' +
          '    </span>\n' +
          '  </div>\n' +
          '</h1>\n');
    });

  });

  describe('template with {} attributes', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="attributes">\n' +
        '%h1\n' +
        '  %div{id: "test"}\n' +
        '    %p{id: \'test2\', ' +
        '        class: "blah", name: null, test: false, checked: false, selected: true} This is some text\n' +
        '      This is some text\n' +
        '    This is some div text\n' +
        '    %label(for = "a"){for: ["b", "c"]}/\n' +
        '    %div{id: [\'test\', 1], class: [model.name, "class2"], for: "something"}\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('attributes').call(null, { model: { name: 'class1' } });
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test">\n' +
        '    <p id="test2" class="blah" selected="selected">\n' +
        '      This is some text\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '    This is some div text\n' +
        '    <label for="a-b-c"/>\n' +
        '    <div id="test-1" class="class1 class2" for="something">\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('template with () attributes', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="attributes">\n' +
        '%h1\n' +
        '  %div(id = "test")\n' +
        '    %p(id=test2 class="blah"\n selected="selected") This is some text\n' +
        '      This is some text\n' +
        '    This is some div text\n' +
        '    %div(id=test){id: 1, class: [model.name, "class2"]}\n' +
        '    %a(href="#" data-key="MOD_DESC")/' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('attributes').call(null, { model: { name: 'class1' } });
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test">\n' +
        '    <p id="test2" class="blah" selected="selected">\n' +
        '      This is some text\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '    This is some div text\n' +
        '    <div id="test-1" class="class1 class2">\n' +
        '    </div>\n' +
        '    <a href="#" data-key="MOD_DESC"/>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('template with id and class selectors', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="attributes">\n' +
        '%h1\n' +
        '  #test.test\n' +
        '    %p#test.blah{id: 2, class: "test"} This is some text\n' +
        '      This is some text\n' +
        '    This is some div text\n' +
        '    .class1.class2/\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('attributes').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test" class="test">\n' +
        '    <p id="test-2" class="blah test">\n' +
        '      This is some text\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '    This is some div text\n' +
        '    <div class="class1 class2"/>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('template with self-closing tags', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="self-closing-tags">\n' +
        '%div\n' +
        '  meta, img, link, script, br, and hr\n' +
        '  %meta\n' +
        '  %meta/\n' +
        '  %meta\n' +
        '    meta\n' +
        '  %img\n' +
        '  %img/\n' +
        '  %img\n' +
        '    img\n' +
        '  %link\n' +
        '  %link/\n' +
        '  %link\n' +
        '    link\n' +
        '  %br\n' +
        '  %br/\n' +
        '  %br\n' +
        '    br/\n' +
        '  %hr\n' +
        '  %hr/\n' +
        '  %hr\n' +
        '    hr\n' +
        '  %div/\n' +
        '  %p/\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('self-closing-tags').call(null, {});
      expect(html).toEqual(
        '<div>\n' +
        '  meta, img, link, script, br, and hr\n' +
        '  <meta/>\n' +
        '  <meta/>\n' +
        '  <meta>\n' +
        '    meta\n' +
        '  </meta>\n' +
        '  <img/>\n' +
        '  <img/>\n' +
        '  <img>\n' +
        '    img\n' +
        '  </img>\n' +
        '  <link/>\n' +
        '  <link/>\n' +
        '  <link>\n' +
        '    link\n' +
        '  </link>\n' +
        '  <br/>\n' +
        '  <br/>\n' +
        '  <br>\n' +
        '    br/\n' +
        '  </br>\n' +
        '  <hr/>\n' +
        '  <hr/>\n' +
        '  <hr>\n' +
        '    hr\n' +
        '  </hr>\n' +
        '  <div/>\n' +
        '  <p/>\n' +
        '</div>\n');
    });

  });

  describe('template with unescaped HTML', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="unescaped">\n' +
        '%h1 !<div>\n' +
        '  !#test.test\n' +
        '    !%p#test.blah{id: 2, class: "test"} This is some text\n' +
        '      !This is some text\n' +
        '!    This is some <div> text\n' +
        '!    <div class="class1 class2"></div>\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('unescaped').call(null, {});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div>\n' +
        '  #test.test\n' +
        '    %p#test.blah{id: 2, class: "test"} This is some text\n' +
        '      This is some text\n' +
        '    This is some <div> text\n' +
        '    <div class="class1 class2"></div>\n' +
        '</h1>\n');
    });

  });

  describe('template with Javascript evaluation', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="evaluation">\n' +
        '.box.error\n' +
        '  %span\n' +
        '    = errorTitle\n' +
        '  .clear\n' +
        '    %span= errorHeading\n' +
        '    = var label = "Calculation: "; label + (1 + 2 * 3)\n' +
        '    = ["hi", "there", "reader!"]\n' +
        '    = evilScript \n' +
        '    %span&= errorHeading\n' +
        '    &= var label = "Calculation: "; label + (1 + 2 * 3)\n' +
        '    &= ["hi", "there", "reader!"]\n' +
        '    &= evilScript \n' +
        '    %span!= errorHeading\n' +
        '    != var label = "Calculation: "; label + (1 + 2 * 3)\n' +
        '    != ["hi", "there", "reader!"]\n' +
        '    != evilScript \n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('evaluation').call(null, {
          errorTitle: "Error Title",
          errorHeading: "Error Heading <div>div text</div>",
          evilScript: '<script>alert("I\'m evil!");</script>'
        });
      expect(html).toEqual(
        '<div class="box error">\n' +
        '  <span>\n' +
        '    Error Title\n' +
        '  </span>\n' +
        '  <div class="clear">\n' +
        '    <span>\n' +
        '      Error Heading &lt;div&gt;div text&lt;/div&gt;\n' +
        '    </span>\n' +
        '    Calculation: 7\n' +
        '    hi,there,reader!\n' +
        '    &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);&lt;/script&gt;\n' +
        '    <span>\n' +
        '      Error Heading &lt;div&gt;div text&lt;/div&gt;\n' +
        '    </span>\n' +
        '    Calculation: 7\n' +
        '    hi,there,reader!\n' +
        '    &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);&lt;/script&gt;\n' +
        '    <span>\n' +
        '      Error Heading <div>div text</div>\n' +
        '    </span>\n' +
        '    Calculation: 7\n' +
        '    hi,there,reader!\n' +
        '    <script>alert("I\'m evil!");</script>\n' +
        '  </div>\n' +
        '</div>\n');
    });

  });

  describe('template with Javascript code lines', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="evaluation">\n' +
        '.main\n' +
        '  - var foo = "hello";\n' +
        '  - foo += " world";\n' +
        '  %span\n' +
        '    = foo\n' +
        '</script>\n' +
        '<script type="text/template" id="evaluation-with-loops">\n' +
        '.main\n' +
        '  - _(["Option 1", "Option 2", "Option 3"]).each(function (option) {\n' +
        '    %span= option\n' +
        '  - });\n' +
        '  - for (var i = 0; i < 5; i++) {\n' +
        '    %p= i\n' +
        '  - }\n' +
        '</script>' +
        '<script type="text/template" id="evaluation-using-context">\n' +
        '.main\n' +
        '  - var foo = model.foo;\n' +
        '  - foo += " world";\n' +
        '  %span\n' +
        '    = foo\n' +
        '</script>' +
      '<script type="text/template" id="attribute-hash-evaluation-using-outer-scope">\n' +
        '.main\n' +
        '  - var foo = "hello world";\n' +
        '  %span{someattribute: foo}\n' +
        '</script>');
    });

    it('should render the correct html using locally defined variables', function () {
      var html = haml.compileHaml('evaluation').call(null, {});
      expect(html).toEqual(
        '<div class="main">\n' +
        '  <span>\n' +
        '    hello world\n' +
        '  </span>\n' +
        '</div>\n');
    });

    it('should render the correct html when the template has loops', function () {
      var html = haml.compileHaml('evaluation-with-loops').call(null, {});
      expect(html).toEqual(
        '<div class="main">\n' +
        '    <span>\n' +
        '      Option 1\n' +
        '    </span>\n' +
        '    <span>\n' +
        '      Option 2\n' +
        '    </span>\n' +
        '    <span>\n' +
        '      Option 3\n' +
        '    </span>\n' +
        '    <p>\n' +
        '      0\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      1\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      2\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      3\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      4\n' +
        '    </p>\n' +
        '</div>\n');
    });

    it('should provide access to the context within inline javascript', function () {
      var model = { foo: "hello"};
      var html = haml.compileHaml('evaluation-using-context').call(null, {model: model});
      expect(html).toEqual(
        '<div class="main">\n' +
        '  <span>\n' +
        '    hello world\n' +
        '  </span>\n' +
        '</div>\n');
    });

    it('should be able to access variables declared as part of the haml', function () {
      var model = { foo: "hello"};
      var html = haml.compileHaml('attribute-hash-evaluation-using-outer-scope').call(null, {model: model});
      expect(html).toEqual(
        '<div class="main">\n' +
        '  <span someattribute="hello world">\n' +
        '  </span>\n' +
        '</div>\n');
    });

  });

  describe('template with comments', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="comments">\n' +
        '.main\n' +
        '  / This is a comment\n' +
        '  /\n' +
        '    %span\n' +
        '      = errorTitle\n' +
        '-#  .clear\n' +
        '-#    %span= errorHeading\n' +
        '-#    = var label = "Calculation: "; return label + (1 + 2 * 3)\n' +
        '-#    = ["hi", "there", "reader!"]\n' +
        '-#    = evilScript \n' +
        '  /[if IE]  \n' +
        '    %a(href = "http://www.mozilla.com/en-US/firefox/" )\n' +
        '      %h1 Get Firefox\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('comments').call(null, {errorTitle: "An error's a terrible thing"});
      expect(html).toEqual(
        '<div class="main">\n' +
        '  <!-- This is a comment  -->\n' +
        '  <!--\n' +
        '    <span>\n' +
        '      An error&#39;s a terrible thing\n' +
        '    </span>\n' +
        '  -->\n' +
        '  <!--[if IE]  >\n' +
        '    <a href="http://www.mozilla.com/en-US/firefox/">\n' +
        '      <h1>\n' +
        '        Get Firefox\n' +
        '      </h1>\n' +
        '    </a>\n' +
        '  <![endif]-->\n' +
        '</div>\n');
    });

  });

  describe('template with Javascript code lines and no closing blocks', function () {

    beforeEach(function () {
      setFixtures(
        '<script type="text/template" id="evaluation-with-loops">\n' +
        '.main\n' +
        '  - _(["Option 1", "Option 2", "Option 3"]).each(function (option) {\n' +
        '    %span= option\n' +
        '  - for (var i = 0; i < 5; i++) {\n' +
        '    %p= i\n' +
        '</script>');
    });

    it('should render the correct html when the template has loops', function () {
      var html = haml.compileHaml('evaluation-with-loops').call(null, {});
      expect(html).toEqual(
        '<div class="main">\n' +
        '    <span>\n' +
        '      Option 1\n' +
        '    </span>\n' +
        '    <span>\n' +
        '      Option 2\n' +
        '    </span>\n' +
        '    <span>\n' +
        '      Option 3\n' +
        '    </span>\n' +
        '    <p>\n' +
        '      0\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      1\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      2\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      3\n' +
        '    </p>\n' +
        '    <p>\n' +
        '      4\n' +
        '    </p>\n' +
        '</div>\n');
    });
  });

  describe('Escaping HTML', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="simple">' +
        '.main\n' +
        '  <div>\n' +
        '    &  <p>\n' +
        '    &  </p>\n' +
        '    &  <span>\n' +
        '    &    <script>alert("I\'m evil!");\n' +
        '    &  </span>\n' +
        '  </div>\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('simple').call(null, {});
      expect(html).toEqual(
        '<div class="main">\n' +
        '  <div>\n' +
        '      &lt;p&gt;\n' +
        '      &lt;/p&gt;\n' +
        '      &lt;span&gt;\n' +
        '        &lt;script&gt;alert(&quot;I&#39;m evil!&quot;);\n' +
        '      &lt;/span&gt;\n' +
        '  </div>\n' +
        '</div>\n');
    });

  });

  describe('Issue #2 - Anonymous functions should pass through \'this\'', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="anonymous">\n' +
        '.test = this.fnOnThis()\n' +
        '.test2 = fnOnThis()\n' +
        '</script>'
      );
    });

    it('should the correct html', function () {
      var that = { fnOnThis: function () { return 'TEST' } };
      var context = { fnOnThis: function () { return 'TEST2' } };
      var html = haml.compileHaml('anonymous').call(that, context);
      expect(html).toEqual(
        '<div class="test">\n' +
        '  TEST\n' +
        '</div>\n' +
        '<div class="test2">\n' +
        '  TEST2\n' +
        '</div>\n');
    });

  });

  describe('Issue #6 - Empty lines should be ignored', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="empty-lines">\n' +
        '%div\n' +
        '  %div\n' +
        '    %div\n' +
        '    \n' +
        '    %div\n' +
        '  \n' +
        '    %div' +
        '\n' +
        '    %div' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('empty-lines').call(null, {});
      expect(html).toEqual(
        '<div>\n' +
        '  <div>\n' +
        '    <div>\n' +
        '    \n' +
        '    </div>\n' +
        '    <div>\n' +
        '  \n' +
        '    </div>\n' +
        '    <div>\n' +
        '    </div>\n' +
        '    <div>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</div>\n');
    });

  });

  describe('Issue #14 - rendering null values', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="null-js-values">\n' +
        '.inline-null\n' +
        '  = null;\n' +
        '.null-evaluating\n' +
        '  = nullValue;\n' +
        '.embedded-null= null\n' +
        '</script>')
    });

    it('should render null values as a string', function () {
      var html = haml.compileHaml('null-js-values').call(null, {nullValue: null});
      expect(html).toEqual(
        '<div class="inline-null">\n' +
        '  \n' +
        '</div>\n' +
        '<div class="null-evaluating">\n' +
        '  \n' +
        '</div>\n' +
        '<div class="embedded-null">\n' +
        '  \n' +
        '</div>\n');
    });
  });

  describe('Whitespace Removal: > and <', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="whitespace-removal">\n' +
        '%blockquote<\n' +
        '  %div\n' +
        '    Foo!\n' +
        '%img\n' +
        '%img>\n' +
        '%img\n' +
        '%p<= "Foo\\nBar"\n' +
        '%img\n' +
        '%pre><\n' +
        '  foo\n' +
        '  bar\n' +
        '%img\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('whitespace-removal').call(null, {});
      expect(html).toEqual(
        '<blockquote><div>\n' +
        '    Foo!\n' +
        '  </div></blockquote>\n' +
        '<img/><img/><img/>\n' +
        '<p>Foo\n' +
        'Bar</p>\n' +
        '<img/><pre>foo\n' +
        'bar</pre><img/>\n');
    });

  });

  describe('template with object reference', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="object-reference">\n' +
        '%h1\n' +
        '  %div[test]\n' +
        '    %p[test2] This is some text\n' +
        '      This is some text\n' +
        '    This is some div text\n' +
        '    .class1[test3]{id: 1, class: "class3", for: "something"}\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('object-reference').call(null, {
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
          get: function (name) {
            return this.attributes[name];
          }
        }
      });
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test">\n' +
        '    <p id="test2" class="blah">\n' +
        '      This is some text\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '    This is some div text\n' +
        '    <div class="class1 class2 class3" id="test-1" for="something">\n' +
        '    </div>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

  describe('html 5 data attributes', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="html5-attributes">\n' +
        '%h1\n' +
        '  %div{id: "test"}\n' +
        '    %p{id: \'test2\', data: {\n' +
        '        class: "blah", name: null, test: false, checked: false, selected: true}} This is some text\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('html5-attributes')({});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div id="test">\n' +
        '    <p id="test2" data-class="blah" data-selected="true">\n' +
        '      This is some text\n' +
        '    </p>\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });
  
  describe('without template', function () {
    it('should render the correct html', function () {
      expect(haml.compileStringToJs("%div").call(null, {})).toEqual('<div>\n</div>\n');
    });
  });

  describe('whitespace preservation', function () {

    beforeEach(function () {
      setFixtures('<script type="text/template" id="whitespace-preservation">\n' +
        '%h1\n' +
        '  %div\n' +
        '    ~ "Foo\\n<pre>Bar\\nBaz</pre>\\n<a>Test\\nTest\\n</a>\\nOther"\n' +
        '</script>');
    });

    it('should render the correct html', function () {
      var html = haml.compileHaml('whitespace-preservation')({});
      expect(html).toEqual(
        '<h1>\n' +
        '  <div>\n' +
        '    Foo\n' +
        '<pre>Bar&#x000A;Baz</pre>\n' +
        '<a>Test&#x000A;Test&#x000A;</a>\n' +
        'Other\n' +
        '  </div>\n' +
        '</h1>\n');
    });

  });

});
