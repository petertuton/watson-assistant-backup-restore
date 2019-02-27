# watson-assistant-backup-restore
IBM Cloud Functions code to backup and restore Watson Assistant configuration using Cloud Object Storage

# Architecture
[Architecture](https://github.com/ptuton/watson-assistant-backup-restore/WatsonAssistantBackupRestore.jpg)

# Assumptions: 
1. Both primary and secondary Watson Assistant service instances and workspaces/skills have been created
    - At least the primary service instance and skills should exist. For test purposes, you can create a new workspace using the sample available in the Watson Assistant UI
2. Cloud Object Storage (COS) service instance has been created with HMAC credentials, and a suitable bucket is available
    - For information on how to create a COS service instance and bucket, refer to [the COS documentation](https://console.bluemix.net/docs/services/cloud-object-storage/getting-started.html#getting-started-console-)
3. IBM Cloud CLI is installed
    - [To install the CLI](https://cloud.ibm.com/docs/cli/reference/ibmcloud?topic=cloud-cli-install-ibmcloud-cli#install_use)
4. IBM Cloud Functions CLI plug-in is installed
    - [To install to plug-in](https://cloud.ibm.com/docs/openwhisk?topic=cloud-functions-cloudfunctions_cli#cloudfunctions_cli)

# Steps
Login to IBM Cloud
```
ic login
```

Target Cloud Foundry and the region in which the primary Waton Assistant instance is located (e.g. `us-south` or `us-east`)
```
ic target -r <region> --cf
```

## Bind Watson Assistant instances to Cloud Functions
For information on the Watson Developer Cloud OpenWhisk SDK and the Watson Assistant package, refer to [the documentation](https://cloud.ibm.com/docs/openwhisk/ow_watson_assistant.html#watson-assistant-package)

Download the Watson packages for Cloud Functions
```
git clone https://github.com/watson-developer-cloud/openwhisk-sdk
```
Deploy the package to Cloud Functions and verify it was created
```
ic fn deploy --manifest openwhisk-sdk/packages/assistant-v1/manifest.yaml
ic fn package list | grep assistant-v1
```

Specify the `version` parameter required for the package 
- setting this after the binding removes the binding...
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

Record the `workspace_id` that is intended for backup (or restore), to be used later

Switch to the region in which the secondary Watson Assistant instance is located
```
ic target -r <region>
```

**Perform the above steps for the secondary region... then switch back to the primary region**

## Bind Cloud Object Storage to Cloud Functions
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

## Get the Cloud Functions Composer code
From [here](https://github.com/ptuton/watson-assistant-backup-restore)!

## Create a new Cloud Functions package
```
ic fn package create watson-assistant-backup-restore
```

## Create a new Cloud Functions action
- note the use of `-a conductor true`, making these actions 'conductor' actions
- for more information on Composer, see [here](https://cloud.ibm.com/docs/openwhisk?topic=cloud-functions-openwhisk_composer#openwhisk_composer)

Create the backup action in the region (and associated CF org and space) where the primary Watson Assistant instances resides.
Create the restore action in the secondary region.
```
ic target -r <primary_region>
ic fn action update watson-assistant-backup-restore/backup backup.js -a conductor true

ic target -r <secondary_region>
ic fn action update watson-assistant-backup-restore/restore restore.js -a conductor true
```

## Command to run backup action
The CLI must be set to the primary region
```
ic fn action invoke watson-assistant-backup-restore/backup --result --blocking --param bucket <bucket_name> --param workspace_id <workspace_id_to_backup>
```

## Command to run restore action 
The CLI must be set to the secondary region

```
ic fn action invoke watson-assistant-backup-restore/restore --result --blocking --param bucket <bucket_name> --param from_workspace_id <workspace_id_with_backup> --param to_workspace_id <workspace_id_to_restore>
```
