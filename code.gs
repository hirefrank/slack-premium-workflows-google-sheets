function apiSlackCall(endpoint, payload) {
  try {
    const user_token = PropertiesService.getScriptProperties().getProperty('user_token');
    const url = "https://slack.com/api/" + endpoint;
    const options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + user_token
      },
      "payload": JSON.parse(payload)
    };
    const response = JSON.parse(UrlFetchApp.fetch(url, options));
    if (response.ok !== true) {
      Logger.log(response);
    }
    return response;
  } catch (error) {
    Logger.log("Error in apiSlackCall: " + error);
    throw error;
  }
}

function fetchPremiumWorkflowExecutions(cursor = null) {
  try {
    const min_date = getMostRecentDate();
    Logger.log(min_date);
    const payload = {
      "min_date_created": min_date,
      "log_event_type": "workflow_billing_result",
      "cursor": cursor
    };
    const data = apiSlackCall("admin.apps.activities.list", JSON.stringify(payload));
    return data.activities;
  } catch (error) {
    Logger.log("Error in fetchPremiumWorkflowExecutions: " + error);
    throw error;
  }
}

function fetchWorkflowInfo(app_id, component_id) {
  try {
    const payload = {
      "app_id": app_id,
    };
    const data = apiSlackCall("admin.workflows.search", JSON.stringify(payload));
    const desiredWorkflow = data.workflows.find(workflow => workflow.id === component_id);
    return desiredWorkflow !== undefined ? desiredWorkflow : null;
  } catch (error) {
    Logger.log("Error in fetchWorkflowInfo: " + error);
    throw error;
  }
}

function fetchUserInfo(user_ids_array) {
  const users = [];
  for (const user_id of user_ids_array) {
    try {
      const payload = {
        "user": user_id,
      };
      const data = apiSlackCall("users.info", JSON.stringify(payload));
      // push real_name if exists, else push name
      users.push(data.user.real_name || data.user.name);
    } catch (error) {
      Logger.log("Error in fetchUserInfo: " + error);
      throw error;
    }
  }
  return users;
}

function convertMicrosecondTimestamp(microseconds) {
  // Convert microseconds to milliseconds
  var millis = Math.floor(microseconds / 1000);
  // Create Date object
  var date = new Date(millis);
  // Format date string as desired
  return Utilities.formatDate(date, "GMT", "MM/dd/yyyy' 'HH:mm:ss.SSS");
}

function getMostRecentDate() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Premium Workflow Executions");

    if (sheet.getLastColumn() == 0) return null;

    var range = sheet.getRange(2, 8, sheet.getLastRow());
    var values = range.getValues(); //2D Array

    // Get an array with just the column values
    var colValues = values.map(function (row) {
      return row[0];
    });

    // Find the maximum value
    var max = Math.max.apply(null, colValues);

    // Parse scientific notation string to number
    var number = Number(max) + 1;

    // Convert scientific notation to regular number
    var res = number.toPrecision();
    return res;
  } catch (error) {
    Logger.log("Error in getMostRecentDate: " + error);
    throw error;
  }
}

function writeDataToSheet(sheet, data, headers) {
  // Clear old data
  // sheet.clearContents();
  
  // Append headers if not present
  if (sheet.getLastColumn() > 0) {
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (existingHeaders.join(',') !== headers.join(',')) {
      sheet.appendRow(headers);
    }
  } else {
    sheet.appendRow(headers);
  }

  // Write rows
  data.forEach(function (row) {
    var rowData = headers.map(function (header) {
      if (header === "created") {
        return row[header].toPrecision();
      } else if (header === "billing_reason") {
        return row[header].join(", ");
      } else if (header === "collaborators") {
        return row[header].join(", ");
      } else {
        return row[header];
      }
    });
    sheet.appendRow(rowData);
  });
}

function main() {
  try {
    // Wrap the code in a while loop to continue executing while premium_executions.response_metadata.next_cursor != ""
    var premium_executions = fetchPremiumWorkflowExecutions();
    do {
      const nc = premium_executions.response_metadata && premium_executions.response_metadata.next_cursor !== "" ? premium_executions.response_metadata.next_cursor : null;
      const filtered = premium_executions.map(({ trace_id, app_id, source, component_type, component_id, payload, created }) => ({
        trace_id,
        app_id,
        source,
        component_type,
        component_id,
        billing_reason: payload.billing_reason,
        is_billing_excluded: payload.is_billing_excluded,
        created
      }));
      Logger.log(filtered);
      
      // add additional key and values to
      filtered.forEach(function(obj) {
        obj.created_pretty = convertMicrosecondTimestamp(obj.created);
        const workflow_metadata = fetchWorkflowInfo(obj.app_id, obj.component_id);
        Object.assign(obj, {
          workflow_title: workflow_metadata.title || null,
          workflow_description: workflow_metadata.description || null,
          workflow_built: workflow_metadata.source || null,
          collaborators: fetchUserInfo(workflow_metadata.collaborators) || null
        });
      });

      var ssPremiumWorkflow = SpreadsheetApp.getActiveSpreadsheet();
      var sheetPremiumWorkflow = ssPremiumWorkflow.getSheetByName("Premium Workflow Executions");

      if (filtered.length > 0) {
        writeDataToSheet(sheetPremiumWorkflow, filtered, Object.keys(filtered[0]));
      }
      if (nc !== null) {
        premium_executions = fetchPremiumWorkflowExecutions(nc);
      }
    } while (premium_executions.response_metadata && premium_executions.response_metadata.next_cursor !== "");
  } catch (error) {
    Logger.log("Error in main: " + error);
    throw error;
  }
}