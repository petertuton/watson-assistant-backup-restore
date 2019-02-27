function main(params) {
  let step = params.$step || 0;
  delete params.$step

  switch (step) {
    // Request a message
    case 0: {
      // TODO: Check for required params: 
      // - workspace_id
      // - input (optional)
      // - expected_output (mandatory if <input> is supplied)

      // Check for a supplied input to use in validation
      let input = (params.input || "Thanks");
      delete params.input;
      params = Object.assign({
        input: {
          text: input
        }
      }, params);

      // Check for a supplied expected_output to use in validation
      let expected_output = (params.expected_output || "You're welcome. Just let me know if you need anything else");
      delete params.expected_output;

      // Store anything we need for the next iteration into state
      let state = {
        $step: 1,
        expected_output
      }

      return { action: 'assistant-v1/message', params, state } 
    }

    // Check for a valid response
    case 1: {
      // Check for an error condition
      let error = params.error;
      if (error) {
        return { error };
      }

      // Process the response from the message request
      let result = (params.output.text == params.expected_output ? "Valid response" : "Invalid response");

      // Return the result
      return { result } 
    }

  }
}