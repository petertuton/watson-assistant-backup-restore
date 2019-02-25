function main(params) {
  let step = params.$step || 0
  delete params.$step

  switch (step) {
    // Get the workspace information from COS
    case 0: {
      // TODO: Check for required params: 
      // - from_workspace_id
      // - to_workspace_id
      // - bucket

      // Add the parameters needed for the current action that we don't already have in params
      // - requires the COS key, which is currently set to the <from_workspace_id>.json
      params = Object.assign({
        key: params.from_workspace_id + '.json'
      }, params);

      // Store anything we need for the next iteration into state
      // - requires the to_workspace_id
      let state = {
        $step: 1,
        to_workspace_id : params.to_workspace_id
      }
      // Remove any params not needed for the current action
      delete params.from_workspace_id;
      delete params.to_workspace_id;

      return { action: 'cloud-object-storage/object-read', params, state } 
    }
    
    // Get the workspace information
    case 1: {
      // Add the parameters needed for the current action that we don't already have in params
      // - requires the workspace information stored in params.body
      let workspace_info = JSON.parse(params.body);

      params = Object.assign({
        workspace_id: params.to_workspace_id,
        name: workspace_info.name,
        description: workspace_info.description,
        language: workspace_info.language,
        intents: workspace_info.intents,
        entities: workspace_info.entities,
        dialog_nodes: workspace_info.dialog_nodes,
        counterexamples: workspace_info.counterexamples,
        metadata: workspace_info.metadata,
        learning_opt_out: workspace_info.learning_opt_out,
        append: false
        }, params);


      // Store anything we need for the next iteration into state
      // - requires the bucket name
      let state = {
        $step: 2,
      }
      // Remove any params not needed for the current action
      delete params.bucket;
      delete params.key;
      delete params.to_workspace_id;
      delete params.body;

      return { action: 'assistant-v1/update-workspace', params, state } 
    }

    // End
    case 2: return { params }
  }
}