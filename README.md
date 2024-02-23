# Sync Slack Premium Workflow Runs to Google Sheets


A lightweight proof of concept that syncs premium workflow executions to Google Sheets with workflow metadata and colloborator information using the Slack API. Useful if you need more information beyond what is offered in the Slack Admin dashboard.

## Getting Started

1. Create a new Google Spreadsheet and rename `Sheet1` to `Premium Workflow Executions`.
2. Enable App Script: Extensions > App Script.
3. Replace the contents of `Code.gs` with `code.gs` in this repo.
4. Create a [Slack user token](https://api.slack.com/authentication/token-types) with OAuth permissions for [admin.app_activities:read](https://api.slack.com/scopes/admin.app_activities:read), [admin.workflows:read](https://api.slack.com/scopes/admin.workflows:read), and [users:read](https://api.slack.com/scopes/users:read).
5. Create `user_token` script properties in App Script with the user token you created in the previous step.  any other desired properties below. ([gear icon] > Settings > Script properties)
6. Save `Code.gs` and run the `main` function. This should populate the `Premium Workflow Executions` sheet.
7. Setup a time based trigger to run the `main`` function every hour. ([alarm clock icon] Triggers > Add Trigger)