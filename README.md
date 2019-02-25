# watson-assistant-backup-restore
IBM Cloud Functions code to backup and restore Watson Assistant configuration using Cloud Object Storage

# Assumptions: 
1. Both primary and secondary Watson Assistant service instances and workspaces/skills have been created
    - At least the primary service instance and skills should exist. For test purposes, you can create a new workspace using the sample available in the Watson Assistant UI
    - To create a new secondary instance and a new, empty workspace/skill in a different region to the primary workspace
2. Cloud Object Storage (COS) service instance has been created with HMAC credentials, and a suitable bucket is available
    - To create a new COS service instance from the Cloud Catalog: https://cloud.ibm.com/catalog/services/cloud-object-storage
    - To create a new COS bucket: ... 
    - To create a new service credentials with the 'writer' role and ensuring "Include HMAC Credential" is selected: ... 
3. IBM Cloud CLI is installed
    - To install: https://cloud.ibm.com/docs/cli/reference/ibmcloud?topic=cloud-cli-install-ibmcloud-cli#install_use
4. IBM Cloud Functions CLI plug-in is installed
    - To install: https://cloud.ibm.com/docs/openwhisk?topic=cloud-functions-cloudfunctions_cli#cloudfunctions_cli
5. The two regions to be used in the article include "US South" (Dallas) and "US East" (Washington DC).

# Steps
Login to IBM Cloud
`ic login`

Target Cloud Foundry and US South region (Dallas)
`ic target -r us-south --cf`

## Bind Cloud Functions to Watson Assistant instances
In Functions, install the Watson Assistant package: https://cloud.ibm.com/docs/openwhisk/ow_watson_assistant.html#watson-assistant-package

git clone https://github.com/watson-developer-cloud/openwhisk-sdk
`ic fn deploy --manifest openwhisk-sdk/packages/assistant-v1/manifest.yaml`

Verify the package was created
`ic fn package list`
(^ should list "assistant-v1" package)

Create version parameter for the package - setting this after the binding removes the binding...
`ic fn package update assistant-v1 --param version 2018-09-20`
(^ check the api for the latest version to pass here...)

List the available service instances
`ic resource service-instances`
^ find the relevant Assistant instance

List the available service instance keys
`ic resource service-keys --instance-name <instance_name>`

Bind the service instance to the package
`ic fn service bind conversation assistant-v1 --instance <instance_name> --keyname <credentials_name>`
^ if there's only one instance with only one set of credentials, the bind request will pick them by default

Verify there are two (sets of) parameters: version and __bx_creds
`ic fn package get assistant-v1 parameters`

Verify configuration by listing the workspaces
`ic fn action invoke --result assistant-v1/list-workspaces`

Record the workspace_id intended for backup/restore for use later...

Switch to us-east region
`ic target -r us-east`

**Perform the same actions for the secondary region...**

Switch back to us-south region
`ic target -r us-south`

## Bind Cloud Functions to Cloud Object Storage

git clone https://github.com/ibm-functions/package-cloud-object-storage.git
`ic fn deploy --manifest package-cloud-object-storage/runtimes/nodejs/manifest.yaml`
`ic fn package list`

List the available service instances
`ic resource service-instances`
^ find the relevant Cloud Object Storage instance

List the available service instance keys
`ic resource service-keys --instance-name <instance_name>`

Bind the service instance to the package
`ic fn service bind cloud-object-storage cloud-object-storage --instance <instance_name> --keyname <credentials_name>`

Verify the parameters: __bx_creds
`ic fn package get cloud-object-storage parameters`

Test writing to the bucket
`ic fn action invoke /_/cloud-object-storage/object-write --blocking --result --param bucket <bucket_name> --param key data.txt --param body "my_test_data"`

Test reading from the bucket
`ic fn action invoke /_/cloud-object-storage/object-read --blocking --result --param bucket <bucket_name> --param key data.txt`

## Get the code
From here!

## Create a package in IBM Cloud Functions
`ic fn package create watson-assistant-backup-restore`

## Create the IBM Cloud Functions actions - note the use of `-a conductor true`, making these actions 'conductor' actions
`ic fn action update watson-assistant-backup-restore/backup backup.js -a conductor true`
`ic fn action update awatson-assistant-backup-restore/restore restore.js -a conductor true`

## Command to run backup action
`ic fn action invoke assistant-dr/backup --result --blocking --param bucket <bucket_name> --param workspace_id <workspace_id_to_backup>`

## Command to run restore action (the CLI must be set to the region into which you want to restore)
`ic fn action invoke assistant-dr/restore --result --blocking --param bucket waha-cloud-object-storage --param from_workspace_id <workspace_id_with_backup> --param to_workspace_id <workspace_id_to_restore>`

