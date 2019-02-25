function main(params) {
  let step = params.$step || 0
  delete params.$step

  switch (step) {
    // Get the workspace information
    case 0: {
      // Delete any presence of 'include_audit' param and force it to true
      delete params.include_audit
      params = Object.assign({
        include_audit: true
      }, params);

      // Check for 'export' parameter and default it to true
      if (params.export === undefined) {
        params = Object.assign({
          export: true
        }, params);
      }

      // Store anything we need for the next iteration into state
      // - requires the bucket name
      let state = {
        $step: 1,
        bucket : params.bucket
      }
      // Remove any params not needed for the current action
      delete params.bucket;

      return { action: 'assistant-v1/get-workspace', params, state } 
    }

    // Write the workspace information to COS
    case 1: {
      // Collect the workspace information from the params into an object
      let workspace_info = {
        created: params.created,
        description: params.description,
        language: params.language,
        learning_opt_out: params.learning_opt_out,
        metadata: params.metadata,
        name: params.name,
        status: params.status,
        updated: params.updated,
        workspace_id: params.workspace_id,
        dialog_nodes: params.dialog_nodes,
        entities: params.entities,
        intents: params.intents,
        counterexamples: params.counterexamples
      }

      // Add the parameters needed for the current action that we don't already have in params
      // - requires the COS key and body
      params = Object.assign({
        key: params.workspace_id + '.json',
        body: JSON.stringify(workspace_info)
      }, params);

      // Store anything we need for the next iteration into state
      let state = {
        $step: 2
      }
      // Remove any params not needed for the current action
      delete params.created;
      delete params.description;
      delete params.language;
      delete params.learning_opt_out;
      delete params.metadata;
      delete params.name;
      delete params.status;
      delete params.updated;
      delete params.workspace_id;
      delete params.dialog_nodes;
      delete params.entities;
      delete params.intents;
      delete params.counterexamples;

      return { action: 'cloud-object-storage/object-write', params, state } 
    }

    // End
    case 2: return { params }
  }
}