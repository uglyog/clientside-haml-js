describe 'filters', ->

  beforeEach () ->
      setFixtures(
        '''<script type="text/template" id="plain-filter">
           %h1
             %p
               :plain
                 Does not parse the filtered text. This is useful for large blocks of text without HTML tags,
                 when you don't want lines starting with . or - to be parsed.
             %span Other Contents
           </script>
        '''
      )

  it 'should render the result of the filter function', ->
    html = haml.compileHaml('plain-filter')()
    expect(html).toEqual(
      '''

      <h1>
        <p>
          Does not parse the filtered text. This is useful for large blocks of text without HTML tags,
          when you don't want lines starting with . or - to be parsed.
        </p>
        <span>
          Other Contents
        </span>
      </h1>

      '''
    )

  it 'should raise an error if the filter is not found', ->
    expect(() ->
      haml.compileStringToJs(
        '''
        %p
          :unknown
            blah di blah di blah
        '''
      )
    ).toThrow(
      '''Filter 'unknown' not registered. Filter functions need to be added to 'haml.filters'. at line 2 and character 10:
           :unknown
         ---------^'''
    )

  it 'generates javascript filter blocks correctly', ->
    expect(
      haml.compileCoffeeHamlFromString(
        '''
        %body
          :javascript
            // blah di blah di blah
            function () {
              return 'blah';
            }
        '''
      )()
    ).toEqual(
      '''
         <body>
           <script type="text/javascript">
             //<![CDATA[
               // blah di blah di blah
               function () {
                 return 'blah';
               }
             //]]>
           </script>
         </body>

      '''
    )

  it 'generates css filter blocks correctly', ->
    expect(
      haml.compileStringToJs(
        '''
        %head
          :css
            /* blah di blah di blah */
            .body {
              color: red;
            }
        '''
      )()
    ).toEqual(
      '''
         <head>
           <style type="text/css">
             /*<![CDATA[*/
               /* blah di blah di blah */
               .body {
                 color: red;
               }
             /*]]>*/
           </style>
         </head>

      '''
    )

  it 'generates CDATA filter blocks correctly', ->
    expect(
      haml.compileStringToJs(
        '''
        %body
          :cdata
            // blah di blah di blah
            function () {
              return 'blah';
            }
        '''
      )()
    ).toEqual(
      '''
         <body>
           <![CDATA[
             // blah di blah di blah
             function () {
               return 'blah';
             }
           ]]>
         </body>

      '''
    )

  it 'generates preserve filter blocks correctly', ->
    expect(
      haml.compileStringToJs(
        '''
        %p
          :preserve
            Foo
            <pre>Bar
            Baz</pre>
            <a>Test
            Test
            </a>
            Other
        '''
      )()
    ).toEqual(
      '''
         <p>
           Foo&#x000A; <pre>Bar&#x000A; Baz</pre>&#x000A; <a>Test&#x000A; Test&#x000A; </a>&#x000A; Other
         </p>

      '''
    )


  it 'generates escape filter blocks correctly', ->
    expect(
      haml.compileStringToJs(
        '''
        %p
          :escaped
            Foo
            <pre>'Bar'
            Baz</pre>
            <a>Test
            Test
            </a>
            Other&
        '''
      )()
    ).toEqual(
      '''
         <p>
           Foo
           &lt;pre&gt;&#39;Bar&#39;
           Baz&lt;/pre&gt;
           &lt;a&gt;Test
           Test
           &lt;/a&gt;
           Other&amp;
         </p>

      '''
    )

  it 'handles large blocks of text with escaped interpolate markers correctly', ->
    hamlSource = '''
                    %h1 Why would I use it?
                    .contents
                      %div
                        Sinatra webapp
                        %pre(class="brush: ruby")
                          :plain
                            post '/contract_proposals' do
                              begin
                                contract_attributes = JSON.parse(request.body.read)['contract']
                                contract = ContractFactory.contract_from contract_attributes

                                if contract.valid?
                                  contract.generate_pdf(File.join(settings.public_folder, PDF_SUBDIR))
                                  logger.info %{action=contract_created_from_condor, account_manager="\\#{contract.account_manager.name}", agent_code=\\#{contract.agency.agent_code}}
                                  return [201, contract.to_json(request.base_url)]
                                else
                                  logger.error %{action=create_contract_proposal_failure, error_message="\\#{contract.validation_errors}"}
                                  logger.error contract_attributes.to_json
                                  return [400, {errors: contract.validation_errors}.to_json]
                                end
                              rescue Exception => e
                                request.body.rewind
                                logger.error %{action=create_contract_proposal_failure, error_message="\\#{e}"}
                                logger.error request.body.read
                                logger.error e
                                return [400, "Sorry, but I couldn't generate your contract proposal!"]
                              end
                            end

                            options '/contract_proposals' do
                              headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
                              headers['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type'
                            end
                 '''

    expected = '''<h1>
                    Why would I use it?
                  </h1>
                  <div class="contents">
                    <div>
                      Sinatra webapp
                      <pre class="brush: ruby">
                        post '/contract_proposals' do
                          begin
                            contract_attributes = JSON.parse(request.body.read)['contract']
                            contract = ContractFactory.contract_from contract_attributes


                              if contract.valid?
                                contract.generate_pdf(File.join(settings.public_folder, PDF_SUBDIR))
                                logger.info %{action=contract_created_from_condor, account_manager="#{contract.account_manager.name}", agent_code=#{contract.agency.agent_code}}
                                return [201, contract.to_json(request.base_url)]
                              else
                                logger.error %{action=create_contract_proposal_failure, error_message="#{contract.validation_errors}"}
                                logger.error contract_attributes.to_json
                                return [400, {errors: contract.validation_errors}.to_json]
                              end
                            rescue Exception => e
                              request.body.rewind
                              logger.error %{action=create_contract_proposal_failure, error_message="#{e}"}
                              logger.error request.body.read
                              logger.error e
                              return [400, "Sorry, but I couldn't generate your contract proposal!"]
                            end
                          end

                          options '/contract_proposals' do
                            headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
                            headers['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type'
                          end
                      </pre>
                    </div>
                  </div>
               '''

    expect(_.str.trim(haml.compileHaml(source: hamlSource)())).toEqual(expected)

  it 'handles large blocks of text correctly', ->

    hamlSource = '''
                    %h1 Why would I use it?
                    .contents
                      %div
                        Webmachine Resource
                        %pre
                          :escaped
                             def options
                               {
                                 'Access-Control-Allow-Methods' => 'POST, OPTIONS',
                                 'Access-Control-Allow-Headers' => 'X-Requested-With, Content-Type'
                               }
                             end
                              
                             def finish_request
                               response.headers['Access-Control-Allow-Origin'] = '*'
                             end
                              
                             def allowed_methods
                               ['GET', 'HEAD', 'POST', 'OPTIONS']
                             end
                              
                             def malformed_request?
                               puts "malformed_request?"
                               body = request.body.to_s
                               if body.nil?
                                 false
                               else
                                 begin
                                   contract_attributes = JSON.parse(request.body.to_s)['contract']
                                   @contract = ContractFactory.contract_from contract_attributes
                                   !@contract.valid?
                                 rescue => e
                                   true
                                 end
                             end
                          %div
                 '''

    expected = '''<h1>
                    Why would I use it?
                  </h1>
                  <div class="contents">
                    <div>
                      Webmachine Resource
                      <pre>
                         def options
                           {
                             &#39;Access-Control-Allow-Methods&#39; =&gt; &#39;POST, OPTIONS&#39;,
                             &#39;Access-Control-Allow-Headers&#39; =&gt; &#39;X-Requested-With, Content-Type&#39;
                           }
                         end
                          
                         def finish_request
                           response.headers[&#39;Access-Control-Allow-Origin&#39;] = &#39;*&#39;
                         end
                          
                         def allowed_methods
                           [&#39;GET&#39;, &#39;HEAD&#39;, &#39;POST&#39;, &#39;OPTIONS&#39;]
                         end
                          
                         def malformed_request?
                           puts &quot;malformed_request?&quot;
                           body = request.body.to_s
                           if body.nil?
                             false
                           else
                             begin
                               contract_attributes = JSON.parse(request.body.to_s)[&#39;contract&#39;]
                               @contract = ContractFactory.contract_from contract_attributes
                               !@contract.valid?
                             rescue =&gt; e
                               true
                             end
                         end
                        <div>
                        </div>
                      </pre>
                    </div>
                  </div>
               '''

    expect(_.str.trim(haml.compileHaml(source: hamlSource)())).toEqual(expected)
