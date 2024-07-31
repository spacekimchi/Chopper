(() => {

    /**
     * Check and set a global guard variable.
     * If this content script is injected into the same page again,
     * it will do nothing next time.
     */
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;
    console.log("I AM OPENED AND NOW RUNNING");
    /**
     * Listen for messages from the background script.
     */
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("MESSAGE RECEIVED");
        if (message.action === "beastify") {
            console.log("GOT BEASTIFY MESSAGE");
        } else if (message.action === "reset") {
            console.log("GOT RESET MESSAGE");
        } else if (message.action === "scrape") {
            console.log("I GOT A MESSAGE TO SCRAPE message:", message);
            const scrapedText = "SOME KIND OF TEXT IM SENDING BACK";
            console.log("Sending response:", scrapedText);
            sendResponse({text: scrapedText});
        }
        return true;
    });
})();
