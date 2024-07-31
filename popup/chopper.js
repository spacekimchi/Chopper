/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
    console.log("Scrape and send function called");
    browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => {
            if (tabs[0]) {
                console.log("Sending message to active tab");
                return browser.tabs.sendMessage(tabs[0].id, {action: "scrape", text: "asdf"});
            } else {
                throw new Error("No active tab found");
            }
        })
        .then(response => {
            console.log("Raw response received:", response);
            if (response && response.text) {
                console.log("Response text:", response.text);
                sendToBackend(response.text);
            } else {
                console.log("Response or response.text is undefined");
            }
        })
        .catch(error => console.error("Error in scrapeAndSend:", error));
}
/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Failed to execute beastify content script: ${error.message}`);
}

browser.tabs.query({active: true, currentWindow: true})
    .then(tabs => {
        return browser.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ["/content_scripts/chopper.js"]
        });
    })
    .then(listenForClicks)
    .catch(reportExecuteScriptError);

function sendToBackend(text) {
    console.log("I AM GOING TO TRY TO SEND TEXT:", text);
    fetch('http://localhost:8000/api/chopper_delivery', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({text: text}),
    })
        .then(response => response.json())
        .then(data => {
            console.log("DATA:", data);
        })
        .catch((error) => {
            console.log("ERROR:", error);
        });
}
