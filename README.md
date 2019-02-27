# watson-assistant-backup-restore
IBM Cloud Functions code to backup and restore Watson Assistant configuration using Cloud Object Storage

# Assumptions: 
1. Both primary and secondary Watson Assistant service instances and workspaces/skills have been created
    - At least the primary service instance and skills should exist. For test purposes, you can create a new workspace using the sample available in the Watson Assistant UI
    - To create a new secondary instance and a new, empty workspace/skill in a different region to the primary workspace
2. Cloud Object Storage (COS) service instance has been created with HMAC credentials, and a suitable bucket is available
    - [To create a new COS service instance from the Cloud Catalog](https://cloud.ibm.com/catalog/services/cloud-object-storage)
    - To create a new COS bucket (TODO)
    - To create a new service credentials with the 'writer' role and ensuring "Include HMAC Credential" is selected (TODO)
3. IBM Cloud CLI is installed
    - [To install the CLI](https://cloud.ibm.com/docs/cli/reference/ibmcloud?topic=cloud-cli-install-ibmcloud-cli#install_use)
4. IBM Cloud Functions CLI plug-in is installed
    - [To install to plug-in](https://cloud.ibm.com/docs/openwhisk?topic=cloud-functions-cloudfunctions_cli#cloudfunctions_cli)
5. The two regions to be used in the article include "US South" (Dallas) and "US East" (Washington DC).

# Steps
Login to IBM Cloud
```
ic login
```

Target Cloud Foundry and the region in which the primary Waton Assistant instance is located (e.g. `us-south` or `us-east`)
```
ic target -r <region> --cf
```

## Bind Cloud Functions to Watson Assistant instances
In Cloud Functions, you'll deploy the [Watson Assistant package](https://cloud.ibm.com/docs/openwhisk/ow_watson_assistant.html#watson-assistant-package)

Download the Watson packages for Cloud Functions
```
git clone https://github.com/watson-developer-cloud/openwhisk-sdk
```
Deploy the package to Cloud Functions and verify it was created
```
ic fn deploy --manifest openwhisk-sdk/packages/assistant-v1/manifest.yaml
ic fn package list | grep assistant-v1
```

Create version parameter for the package - setting this after the binding removes the binding...
- check for the latest version in the [API reference](https://cloud.ibm.com/apidocs/assistant#versioning)
- at the time of writing, the latest verion was `2018-09-20`
```
ic fn package update assistant-v1 --param version <version>
```

List the available service instances
```
ic resource service-instances
```
Locate the relevant Watson Assistant instance and record its name, replacing `<service_name>` (below) with the appropriate value

List the available service instance keys
```
ic resource service-keys --instance-name <instance_name>
```

Bind the service instance to the package
```
ic fn service bind conversation assistant-v1 --instance <instance_name> --keyname <credentials_name>
```

Verify there are two (sets of) parameters: `version` and `__bx_creds`
```
ic fn package get assistant-v1 parameters
```

Verify the configuration by listing the workspaces
```
ic fn action invoke --blocking --result assistant-v1/list-workspaces
```

Record the `workspace_id` that is intended for backup/restore for use later...

Switch to the region in which the secondary Watson Assistant instance is located
```
ic target -r <region>
```

**Perform the above steps for the secondary region... then switch back to the primary region**

## Bind Cloud Functions to Cloud Object Storage
In Cloud Functions, you'll deploy the [Cloud Object Storage package](https://cloud.ibm.com/docs/openwhisk?topic=cloud-functions-cloud_object_storage_actions#cloud_object_storage_actions)

Download the Cloud Object Storage package for Cloud Functions
```
git clone https://github.com/ibm-functions/package-cloud-object-storage.git
```
Deploy the package to Cloud Functions and verify it was created
```
ic fn deploy --manifest package-cloud-object-storage/runtimes/nodejs/manifest.yaml
ic fn package list | grep cloud-object-storage
```

List the available service instances
```
ic resource service-instances
```
Locate the relevant Cloud Object Storage instance and record its name, replacing `<service_name>` (below) with the appropriate value

List the available service instance keys
```
ic resource service-keys --instance-name <instance_name>
```

Bind the service instance to the package
```
ic fn service bind cloud-object-storage cloud-object-storage --instance <instance_name> --keyname <credentials_name>
```

Verify the parameters: `__bx_creds`
```
ic fn package get cloud-object-storage parameters
```

Test writing to the Cloud Object Storage bucket
```
ic fn action invoke cloud-object-storage/object-write --blocking --result --param bucket <bucket_name> --param key data.txt --param body "my_test_data"
```

Test reading from the bucket
```
ic fn action invoke cloud-object-storage/object-read --blocking --result --param bucket <bucket_name> --param key data.txt
```

## Get the code
From [here](https://github.com/ptuton/watson-assistant-backup-restore)!

## Create a package in IBM Cloud Functions
```
ic fn package create watson-assistant-backup-restore
```

## Create the IBM Cloud Functions actions 
- note the use of `-a conductor true`, making these actions 'conductor' actions
Create the backup action in the region (and associated CF org and space) where the primary Assistant instances resides.
Create the restore action in the secondary region. 
```
ic fn action update watson-assistant-backup-restore/backup backup.js -a conductor true
ic fn action update watson-assistant-backup-restore/restore restore.js -a conductor true
```

## Command to run backup action
- the CLI must be set to the region into which you want to backup
```
ic fn action invoke watson-assistant-backup-restore/backup --result --blocking --param bucket <bucket_name> --param workspace_id <workspace_id_to_backup>
```

## Command to run restore action 
- the CLI must be set to the region into which you want to restore

```
ic fn action invoke watson-assistant-backup-restore/restore --result --blocking --param bucket <bucket_name> --param from_workspace_id <workspace_id_with_backup> --param to_workspace_id <workspace_id_to_restore>
```
