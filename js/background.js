
//////////////////////////////////////////////////////////////////////
//
// This background page:
//
//   1) Holds the selected options and provides them
//      to the other scripts when requested
//
//   2) Registers and handles the right-click context menus
//
//   3) Receives and handles Ctrl-Shift-M notifications from the 
//      content scripts
//
//////////////////////////////////////////////////////////////////////

var baseGmailUrl = "https://calendar.google.com/";
var mailtoUrlSuffix = "mail/?extsrc=mailto&url=";
var knownPorts = [];

function makeGmailDomainUrl() {
  var gmailUrl = baseGmailUrl;
  var domainName = window.localStorage["domainName"];
  if ((typeof domainName != "undefined") && (domainName != "")) {
    gmailUrl += "a/" + domainName + "/";
  }
  return gmailUrl;
}

// Send message to the mailto script to update its cached gmail url and other options.
// We also use it to add or remove the context menus
// Note: the options page sends this on save
chrome.extension.onConnect.addListener(function(port) {
  if (port.name != "GmailUrlConn")
    return;

  port.onMessage.addListener(function(msg) {
    if (msg.req == "OptionsPlease") {
      port.postMessage({
        gmailDomainUrl: makeGmailDomainUrl() + mailtoUrlSuffix,
        windowOptions: window.localStorage["gmail_window_options"],
        enableShortcut: !(window.localStorage["enable_shortcut"] == "off")
      });
      addToKnownPorts(port);
    } else if (msg.req == "OptionsChanged") {
      sendToKnownPorts({
        gmailDomainUrl: makeGmailDomainUrl() + mailtoUrlSuffix,
        windowOptions: window.localStorage["gmail_window_options"],
        enableShortcut: !(window.localStorage["enable_shortcut"] == "off")
      });
      refreshContextMenus();
    } else if (msg.req == "EmailThisPage") {
      console.log(port);
      openGmail(port.sender.tab.url, port.sender.tab.title);
    } else {
      console.log("Unsupported req on valid port");
    }
  });
});

function addToKnownPorts(port) {
  knownPorts.push(port);
  port.onDisconnect.addListener(function (p) {
    var i = knownPorts.indexOf(p);
    if (i == -1)
      console.log("What? Disconnected from an unknown port?");
    else knownPorts.splice(i,1);
  });
}

function sendToKnownPorts(msg) {
  knownPorts.forEach(function(p) { p.postMessage(msg); });
}



// Context menu callbacks
function menuClicked(type, info, tab) {
  var emailStr = "";
  var emailSubj = "";
  var addPage = true;
  switch (type) {
  case 'page':
    emailStr = info.pageUrl;
    emailSubj = tab.title;
    addPage = false;
    break;
  case 'selection':
    emailStr = info.selectionText;
    emailSubj = tab.title;
    break;
  case 'link':
    emailStr = info.linkUrl;
    emailSubj = info.linkUrl.replace(/.*?:\/\//g, "").replace("www.", "");
    break;
  default:
    emailStr = info.srcUrl;
    emailSubj = "A nice " + type;
  }
  if (addPage)
    emailStr = emailStr + "\nFrom: " + info.pageUrl;
  openGmail(emailStr, emailSubj);
}
function openGmail(emailStr, emailSubj) {
  // Build the Gmail URL
  var gmailFullUrl = makeGmailDomainUrl() + "?action=TEMPLATE&trp=false" + "&text=" + encodeURIComponent(emailSubj) + "&details=" + encodeURIComponent(emailStr);

  // Open the composition window/tab
  window.open(gmailFullUrl,"_blank",window.localStorage["gmail_window_options"]);
}
function creationCallback() {
  if (chrome.extension.lastError)
    console.log("Error creating context menu: ", chrome.extension.lastError);
}


// Right-click menus registration
function refreshContextMenus() {
  chrome.contextMenus.removeAll();
  if (!(window.localStorage["enable_email_this"] == "off"))
    contextMenusAdd();
}

function contextMenusAdd() {
  chrome.contextMenus.create({ "title": "&Add to Google Calendar", "contexts": ['page'], 
    "onclick": function(info,tab) { menuClicked('page',info,tab) } }, creationCallback);
  chrome.contextMenus.create({ "title": "&Add to Google Calendar", "contexts": ['selection'], 
    "onclick": function(info,tab) { menuClicked('selection',info,tab) } }, creationCallback);
  chrome.contextMenus.create({ "title": "&Add to Google Calendar", "contexts": ['link'], 
    "onclick": function(info,tab) { menuClicked('link',info,tab) } }, creationCallback);
  chrome.contextMenus.create({ "title": "&Add to Google Calendar", "contexts": ['image'], 
    "onclick": function(info,tab) { menuClicked('image',info,tab) } }, creationCallback);
  chrome.contextMenus.create({ "title": "&Add to Google Calendar", "contexts": ['video'], 
    "onclick": function(info,tab) { menuClicked('video',info,tab) } }, creationCallback);
  chrome.contextMenus.create({ "title": "&Add to Google Calendar", "contexts": ['audio'], 
    "onclick": function(info,tab) { menuClicked('audio clip',info,tab) } }, creationCallback);
}

refreshContextMenus();