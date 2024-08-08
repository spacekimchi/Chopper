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
                return browser.tabs.sendMessage(tabs[0].id, {action: "scrape"});
            } else {
                throw new Error("No active tab found");
            }
        })
        .then(response => {
            console.log("Raw response received:", response);
            if (response && response.text) {
                console.log("Response text:", response.text);
                sendToBackend({
                    text: response.text,
                    hostname: response.hostname,
                    pathname: response.pathname,
                    sourceUrl: response.sourceUrl,
                });
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

function sendToBackend(params) {
    console.log("I AM GOING TO TRY TO SEND PARAMS:", params);
    let content = document.querySelector("#popup-content");
    let counter = 0;
    let handle = setInterval(function() {
        content.innerText = `Fetching${'.'.repeat(counter % 4)}`;
        counter += 1;
    }, 1000);
    fetch('http://localhost:8000/api/chopper', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    })
        .then(response => response.json())
        .then(data => {
            console.log("DATA:", data);
            content.innerText = "Success!";
            clearInterval(handle);
            handle = 0;
        })
        .catch((error) => {
            console.log("ERROR:", error);
            content.innerText = `Error: ${error}`;
            clearInterval(handle);
            handle = 0;
        });
}
