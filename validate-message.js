function main(params) {
  let step = params.$step || 0
  delete params.$step

  switch (step) {
    // Request a message
    case 0: {
      // TODO: Check for required params: 
      // - workspace_id
      // - input (optional)
      // - expected_output (mandatory if <input> is supplied)

      // Check for a supplied input to use in validation
      let input = params.input;
      delete params.input;
      if (input === undefined) {
        // No input - default it
        input = "Thanks!";
      }
      params = Object.assign({
        input: {
          text: input
        }
      }, params);

      // Check for a supplied expected_output to use in validation
      let expected_output = params.expected_output;
      if (expected_output === undefined) {
        // No expected output provided - default it
        expected_output = "You're welcome. Just let me know if you need anything else"
      }

      // Store anything we need for the next iteration into state
      // - requires nothing, as yet
      let state = {
        $step: 1,
        expected_output
      }
      // Remove any params not needed for the current action
      delete params.expected_output;

      return { action: 'assistant-v1/message', params, state } 
    }

    // Write the workspace information to COS
    case 1: {
      // Check for an error condition
      let error = params.error;
      if (error) {
        let state = {
          $step: 3
        }
        return { error };
      }

      // Process the response from the message request
      const expected = params.expected_output;
      const response = params.output.text;
      let result = "Valid response";
      if (response != expected) {
        // Invalid response - does it really matter though? We're just checking for -any- response...
        result = "Invalid response";
      }

      return { result } 
    }

  }
}