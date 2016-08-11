
describe 'element generator', () ->
  beforeEach () ->
    @node = document.createElement('div')

  it 'should transform normal elements to createElements', () ->
    txt = '''
      %h1#ugh.huga.buga
        .test
          %p foo
    '''

    exp = '''<h1 id="ugh" class="huga buga"><div class="test"><p>      foo</p></div></h1>'''
    
    src = haml.compileHaml(source: txt, generator: 'elementgenerator')
    @node.appendChild(src())
    expect(@node.innerHTML).toEqual(exp)


  it 'should work with eval with elements', () ->
    txt = '''
      .root
        %p
          = title
    '''
    exp = '''<div class="root"><p><div></div></p></div></h1>'''

    src = haml.compileHaml(source: txt, generator: 'elementgenerator')
    div_node = document.createElement('div')
    @node.appendChild(src({ title: div_node }))
    expect(@node.innerHTML).toEqual(exp)
    