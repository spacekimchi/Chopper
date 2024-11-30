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
    if (message.action === "beastify") {
    } else if (message.action === "reset") {
    } else if (message.action === "scrape") {
      // www.foo.com/bar/cat
      const sourceUrl = window.location.toString();
      // www.foo.com
      const hostname = window.location.host;
      // /bar/cat
      const pathname = window.location.pathname;
      const textAndImage = getArticleTextAndImage();
      // debugger;
      // textAndImage['text'] = "";
      if (textAndImage['text'] == "") {
        return;
      }
      sendResponse({
        text: textAndImage['text'],
        imageUrls: textAndImage['imageUrls'],
        hostname: hostname,
        pathname: pathname,
        sourceUrl: sourceUrl,
      });
    } else {
      // TODO: Send info to the backend that we couldn't find anything to scrape
    }
    return true;
  });

  function getArticleTextAndImage() {
    let res = { text: grabText(), imageUrls: grabImages() };
    return res;
  }

  function grabImages() {
    const allImages = document.querySelectorAll('img');
    let filteredImages = [];
    const sizeLimit = 399;
    const otherSize = 200;
    allImages.forEach(image => {
      if ((sizeLimit < image.width && 0 < image.width && otherSize < image.height) && (sizeLimit < image.height && 0 < image.height && otherSize < image.width)) {
        filteredImages.push(getImageSrc(image));
      }
    });
    filteredImages = [...new Set(filteredImages)]
    return filteredImages;
  }

  function getImageSrc(image) {
    if (image.getAttribute('data-lazy-src')) {
      return image.getAttribute('data-lazy-src');
    } else if (image.getAttribute('data-src')) {
      return image.getAttribute('data-src');
    } else if (image.getAttribute('data-pin-media')) {
      return image.getAttribute('data-pin-media');
    } else {
      return image.src;
    }
  }

   //  const exclusionStrings = ['comment', 'conversation', 'question', 'review', 'adthrive', 'google_ad', 'media', 'skip', 'breadcrumb', 'disclosure', 'drawer-nav', '-nav', 'nav-', 'social', 'footer', 'press-', '-press'];

  //  // Add 'form' and 'footer' to the list of elements to exclude
  //  const elementsToExclude = ['form', 'footer', 'header', 'nav'];

  function grabText() {
    // Define the exclusion strings (case-insensitive)
    const exclusionStrings = ['comment', 'conversation', 'question', 'review', 'adthrive', 'google_ad', 'media', 'skip', 'breadcrumb', 'disclosure', 'drawer-nav', '-nav', 'nav-', 'social', 'footer', 'press-', '-press', 'icon', 'widget-posts', 'post-widget', 'discussion', 'carousel', 'rating', 'notessection', 'newsletters', 'creditstag'];

    // Elements to exclude by tag name (case-insensitive)
    const elementsToExclude = [
      'form',
      'footer',
      'iframe',
      'header',
      'nav',
      'script',
      'style',
      'noscript',
      'code',
      'pre',
      'textarea'
    ];

    /**
     * Determines if an element should be excluded based on its tag name, class, or id.
     * The <body> element is **never** excluded, even if it matches exclusion criteria.
     * @param {Element} element - The DOM element to check.
     * @returns {boolean} - True if the element should be excluded; otherwise, false.
     */
    function shouldExclude(element) {
      // **Never exclude the <body> element**
      if (element === document.body) {
        return false;
      }

      const nodeName = element.nodeName.toLowerCase();

      // Check if the element's tag name is in the exclusion list
      if (elementsToExclude.includes(nodeName)) {
        return true;
      }

      // Check if any of the element's classes include an exclusion string
      if (element.classList) {
        let classNames = element.classList.toString();
        for (const cls of element.classList) {
          for (const str of exclusionStrings) {
            if (cls.toLowerCase().includes(str.toLowerCase())) {
              return true;
            }
          }
        }
      }

      // Check if the element's id includes an exclusion string
      if (element.id) {
        for (const str of exclusionStrings) {
          if (element.id.toLowerCase().includes(str.toLowerCase())) {
            return true;
          }
        }
      }

      // If none of the exclusion criteria matched
      return false;
    }

    /**
     * Recursively traverses the DOM tree, collecting text from non-excluded elements.
     * @param {Node} node - The current DOM node.
     * @param {Array} collectedText - An array to accumulate the extracted text.
     */
    function traverse(node, collectedText) {
      // If the node is an element and should be excluded, skip its subtree
      if (node.nodeType === Node.ELEMENT_NODE && shouldExclude(node)) {
        return;
      }

      // If the node is a text node, process and collect its text
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent
          .replace(/\t/g, '')       // Remove tabs
          .replace(/\n+/g, ' ')    // Collapse multiple newlines
          .trim();                   // Trim whitespace

        if (text) {
          collectedText.push(text);
        }
      }

      // Recursively traverse child nodes
      node.childNodes.forEach(child => traverse(child, collectedText));
    }

    // Initialize an array to hold the collected text
    let collectedText = [];

    // Start traversal from the body element
    traverse(document.body, collectedText);

    // Join the collected text with newline separators
    let textContent = collectedText.join('\n');

    // Clean up the final text content
    textContent = textContent.trim()                        // Remove leading and trailing whitespace
      .replace(/[ ]+/g, ' ')                                // Replace multiple spaces with a single space
      .replace(/\n+/g, ' ');                                // Collapse multiple newlines into one

    // Output the processed text content
    return textContent;
  }
})();
