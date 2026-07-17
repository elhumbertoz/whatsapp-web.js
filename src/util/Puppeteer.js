/**
 * Expose a function to the page, re-registering it if the page has
 * been reloaded and the browser-side binding was lost while Puppeteer's
 * internal registry still holds a stale entry.
 *
 * @param {object} page - Puppeteer Page instance
 * @param {string} name
 * @param {Function} fn
 */
async function exposeFunctionIfAbsent(page, name, fn) {
    const exist = await page.evaluate((name) => {
        return !!window[name];
    }, name);
    if (exist) {
        return;
    }
    try {
        await page.removeExposedFunction(name);
    } catch (ignoredError) {
        // Not previously registered — nothing to remove.
    }
    await page.exposeFunction(name, fn);
}

module.exports = { exposeFunctionIfAbsent };
