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
                // Need to send to backend that we weren't able to find a recipe on the page
                setPopupContent('Unable to find any text to send!');
                console.log("Response or response.text is undefined");
            }
        })
        .catch(error => console.error("Error in scrapeAndSend:", error));
}

// Function to get the CSRF token from the form
function getCSRFToken(form) {
  // Try to get it from the meta tag first
  let token = form.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  // If not found, try to get it from the hidden input field
  if (!token) {
    token = form.querySelector('input[name="authenticity_token"]')?.value;
  }

  return token;
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

async function getCookies(domain) {
  return new Promise((resolve) => {
    browser.cookies.getAll({domain: domain}, (cookies) => {
      resolve(cookies);
    });
  });
}

function setPopupContent(content) {
    let popupContent = document.querySelector("#popup-content");
    popupContent.innerHTML = content;
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

async function sendToBackend(params) {
    setPopupContent('Fetching');
    // Try with different URL formats
    const cookies1 = await getCookies('http://localhost:3000');
    console.log('Cookies for http://localhost:3000:', cookies1);

    const cookies2 = await getCookies('https://localhost:3000');
    console.log('Cookies for https://localhost:3000:', cookies2);

    const cookies3 = await getCookies('http://localhost');
    console.log('Cookies for http://localhost:', cookies3);

    const cookies4 = await getCookies('localhost');
    console.log('Cookies for localhost:', cookies4);

    const cookies5 = await getCookies('choppinglist.co');
    console.log('Cookies for choppinglist:', cookies5);

    // If still not working, try getting all cookies
    browser.cookies.getAll({}, (allCookies) => {
      console.log('All cookies:', allCookies);
    });
    console.log("I AM GOING TO TRY TO SEND PARAMS:", params);
    let content = document.querySelector("#popup-content");
    // let handle = setInterval(function() {
    //     content.innerText = `Fetching${'.'.repeat(counter % 4)}`;
    //     counter += 1;
    // }, 1000);
    const domain = 'http://localhost:3000';  // or your actual domain
    const cookies = await getCookies(domain);
    const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    console.log("cookieHeader:", cookieHeader);
    setPopupContent('Fetching Form');

    // Fetch the form
    const response = await fetch('http://localhost:3000/extension_form', {
        credentials: 'include',
        headers: {
            'Cookie': cookieHeader
        }
    });
    const html = await response.text();

    console.log("HTML:", html);

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    console.log("DOC:", doc);

    // Get the form
    const form = doc.querySelector('form#extension-recipe-form');
    const formAction = form.action;
    console.log("FORM ACTION:", formAction);

    // Fill out the form
    const formData = new FormData(form);
    formData.set('text', params.text);
    formData.set('source_url', params.sourceUrl);
    formData.set('hostname', params.hostname);
    formData.set('pathname', params.pathname);
    console.log("FORM DATA:", formData);

    setPopupContent('Submitting Recipe');
    // Submit the form
    const submitResponse = await fetch(formAction, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
            'Cookie': cookieHeader
        }
    });

    const result = await submitResponse.text(); // Expecting HTML response
    console.log(result);
    setPopupContent('Success!');
    // clearInterval(handle);
    // handle = 0;
    return result;
}
