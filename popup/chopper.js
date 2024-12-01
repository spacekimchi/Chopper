const isDevelopment = true; // Set to false for production
const BACKEND_DOMAIN = isDevelopment
  ? 'http://localhost:3000'
  : 'https://choppinglist.co';
/*
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
  browser.tabs.query({active: true, currentWindow: true})
    .then(tabs => {
      if (tabs[0]) {
        return browser.tabs.sendMessage(tabs[0].id, {action: "scrape"});
      } else {
        throw new Error("No active tab found");
      }
    })
    .then(response => {
      if (response && response.text) {
        sendToBackend({
          text: response.text,
          hostname: response.hostname,
          pathname: response.pathname,
          sourceUrl: response.sourceUrl,
          imageUrls: response.imageUrls
        });
      } else {
        // Need to send to backend that we weren't able to find a recipe on the page
        let popupContent = document.querySelector("#popup-content");
        popupContent.innerHTML = 'Unable to find any text to send!';
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
}

async function getCookies(domain) {
  return new Promise((resolve) => {
    browser.cookies.getAll({domain: domain}, (cookies) => {
      resolve(cookies);
    });
  });
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
  const popupContent = document.querySelector("#popup-content");
  const spinnerContainer = document.querySelector("#loading-spinner");

  const domain = `${BACKEND_DOMAIN}`;
  const cookies = await getCookies(domain);
  const cookieHeader = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  spinnerContainer.classList.remove("hidden");

  const response = await fetch(`${BACKEND_DOMAIN}/extension_form`, {
    credentials: 'include'
  });
  if (response.status === 403) {
    spinnerContainer.classList.add("hidden");
    popupContent.innerHTML = 'Please verify your email first!';
    return;
  } else if (response.status === 401) {
    spinnerContainer.classList.add("hidden");
    popupContent.innerHTML = `Please sign in first<br><a href="${BACKEND_DOMAIN}/sign_in" target="_blank">Sign In</a>`;
    return;
  } else if (response.status !== 200) {
    spinnerContainer.classList.add("hidden");
    popupContent.innerHTML = `Error fetching form: ${response.status}`;
    return;
  } else {
    spinnerContainer.classList.remove("hidden");
    popupContent.innerHTML = `Submitting Recipe`;
    const html = await response.text();

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Get the form
    const form = doc.querySelector('form#extension-recipe-form');
    const formAction = form.action;

    // Fill out the form
    const formData = new FormData(form);
    formData.set('text', params.text);
    formData.set('source_url', params.sourceUrl);
    formData.set('hostname', params.hostname);
    formData.set('pathname', params.pathname);
    params.imageUrls.forEach((url) => {
      formData.append('imageUrls[]', url);
    });

    // Submit the form
    const submitResponse = await fetch(formAction, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Cookie': cookieHeader
      }
    });
    if (submitResponse.status === 201) {
      const result = await submitResponse.text();
      spinnerContainer.classList.add("hidden");
      popupContent.innerHTML = `Saved Recipe! <div>View your recipes <a href="${BACKEND_DOMAIN}/recipes">here</a></div>`;
      return result;
    } else {
      spinnerContainer.classList.add("hidden");
      popupContent.innerHTML = "Something went wrong when submitting... <div>We'll look into it right away</div>";
      return "";
    }
  }
}
