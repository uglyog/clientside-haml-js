describe 'code generators', ->

  describe 'with fault tolerance off', ->

    describe 'javascript generate', ->

      it 'will raise an exception on error', ->
        expect(-> haml.compileHaml(source: '.test= null.toString()')() ).toThrow()

  describe 'with fault tolerance on', ->

    describe 'javascript generate', ->

      it 'will not raise an exception on error', ->
        expect(-> haml.compileHaml(source: '.test= null.toString()', tolerateFaults: true)() ).not.toThrow()