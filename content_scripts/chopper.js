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

    /**
     * Listen for messages from the background script.
     */
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        console.log("MESSAGE RECEIVED");
        if (message.action === "beastify") {
            console.log("GOT BEASTIFY MESSAGE");
        } else if (message.action === "reset") {
            console.log("GOT RESET MESSAGE");
        } else if (message.action === "scrape") {
            // www.foo.com/bar/cat
            const sourceUrl = window.location.toString();
            // www.foo.com
            const hostname = window.location.host;
            // /bar/cat
            const pathname = window.location.pathname;
            const scrapedText = getArticleText(hostname);
            console.log("Sending response:", scrapedText);
            if (scrapedText === "Recipe not found!") {
                return;
            }
            sendResponse({
                text: scrapedText,
                hostname: hostname,
                pathname: pathname,
                sourceUrl: sourceUrl,
            });
        } else {
            // TODO: Send info to the backend that we couldn't find anything to scrape
            console.log("RECEIVED AN UNKNOWN MESSAGE");
        }
        return true;
    });

    const urlMaps = {
        "cooking.nytimes.com": {
            selectors: ["div.recipe"],
            imageUrls: []
        },
        "www.pillsbury.com": {
            selectors: [
                "div.recipeIngredients.primary",
                "div.recipeSteps.primary"
            ],
            imageUrls: []
        },
        "tasty.co": {
            selectors: [
                "div.recipe-time-container",
                "div.ingredients-prep"
            ],
            imageUrls: []
        },
        "www.allrecipes.com": {
            selectors: [
                "h1.article-heading",
                "p.article-subheading",
                "div.mm-recipes-details",
                "div.mm-recipes-structured-ingredients",
                "div.mm-recipes-steps",
                "div.mm-recipes-nutrition-facts"
            ],
            imageUrls: []
        }
    };

    function getArticleText(hostname) {
        let text = "";
        if (hostname in urlMaps) {
            for (let query of urlMaps[hostname]["selectors"]) {
                text += grabText(query);
            }
        } else {
            // Default selectors.
            // It seems like most recipe blogs use some sort of template.
            // The layout on most of them are similar.
            // This should cover many websites.
            let selectors = [
                "article > header",
                "article > .entry-content"
            ];
            for (let query of selectors) {
                text += grabText(query);
            }
        }
        return text || "Recipe not found!";
    }

    function grabText(query) {
        let elements = document.querySelectorAll(query);
        let text = "";
        elements.forEach(el => {
            text += el.innerText + "\n";
        });
        return text;
    }
})();
