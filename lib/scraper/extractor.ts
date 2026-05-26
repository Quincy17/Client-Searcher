import { Page } from "playwright";

interface ExtractedLead {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  instagramUrl: string | null;
}

/**
 * Extract an Instagram URL from a website's HTML by doing a quick fetch
 */
async function findInstagramFromWebsite(websiteUrl: string): Promise<string | null> {
  if (!websiteUrl) return null;
  
  let formattedUrl = websiteUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `http://${formattedUrl}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

    const response = await fetch(formattedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    // Regex to match instagram links
    const igRegex = /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\-\.]+)\/?["']/i;
    const match = html.match(igRegex);
    
    if (match && match[1]) {
      const url = match[1];
      // Clean up common false positives
      if (
        url.includes("/p/") || 
        url.includes("/reel/") || 
        url.includes("/developer") || 
        url.includes("/about") ||
        url.endsWith("instagram.com") ||
        url.endsWith("instagram.com/")
      ) {
        return null;
      }
      return url;
    }
  } catch (err) {
    // Fail silently, instagram discovery is optional and shouldn't block the scraper
    console.log(`Failed to fetch instagram from website ${formattedUrl}:`, (err as Error).message);
  }
  
  return null;
}

/**
 * Extracts business details from the active Playwright detail page
 */
export async function extractBusinessDetails(page: Page): Promise<ExtractedLead> {
  // 1. Extract name (Usually the only H1 on Google Maps detail pane)
  let name = "";
  try {
    await page.waitForSelector("h1", { timeout: 5000 });
    name = (await page.locator("h1").first().textContent()) || "";
    name = name.trim();
  } catch (e) {
    console.error("Could not find business H1 name");
  }

  // 2. Extract rating & review count from div.F7nice
  let rating: number | null = null;
  let reviewCount: number | null = null;
  try {
    const ratingElement = page.locator("div.F7nice").first();
    if (await ratingElement.isVisible()) {
      const text = (await ratingElement.textContent()) || "";
      // Text looks like "4.5(210)" or "4,5(210)" or "4.5210 ulasan"
      // Let's replace comma with dot for Indonesian locale
      const normalizedText = text.replace(",", ".");
      
      const ratingMatch = normalizedText.match(/^([0-5]\.[0-9])/);
      if (ratingMatch && ratingMatch[1]) {
        rating = parseFloat(ratingMatch[1]);
      }
      
      const reviewsMatch = normalizedText.match(/\(([\d\.,\s]+)\)/);
      if (reviewsMatch && reviewsMatch[1]) {
        // Strip out dots or commas from review count (e.g. 1.200 or 1,200)
        const cleanCount = reviewsMatch[1].replace(/[\.,\s]/g, "");
        reviewCount = parseInt(cleanCount, 10);
      }
    }
  } catch (e) {
    console.log("Could not extract rating/reviews:", (e as Error).message);
  }

  // 3. Extract category
  let category: string | null = null;
  try {
    // Typically inside button.DkEaCc or jsaction*="category" or adjacent to rating
    const catLoc = page.locator("button[jsaction*='category']").first();
    if (await catLoc.isVisible()) {
      category = (await catLoc.textContent()) || null;
      if (category) category = category.trim();
    } else {
      const catFallback = page.locator("span.DkEaCc").first();
      if (await catFallback.isVisible()) {
        category = (await catFallback.textContent()) || null;
        if (category) category = category.trim();
      }
    }
  } catch (e) {
    console.log("Could not extract category");
  }

  // 4. Extract address (stable data-item-id)
  let address: string | null = null;
  try {
    const addrLoc = page.locator("[data-item-id='address']").first();
    if (await addrLoc.isVisible()) {
      address = (await addrLoc.textContent()) || null;
      if (address) {
        address = address.trim();
        // Remove icon or prefix text if any
        address = address.replace(/^[^a-zA-Z0-9]+/, "");
      }
    }
  } catch (e) {
    console.log("Could not extract address");
  }

  // 5. Extract phone (stable data-item-id prefix)
  let phone: string | null = null;
  try {
    const phoneLoc = page.locator("[data-item-id^='phone:tel:']").first();
    if (await phoneLoc.isVisible()) {
      const ariaLabel = await phoneLoc.getAttribute("aria-label");
      if (ariaLabel) {
        // aria-label looks like "Telepon: +62 812-3456-7890" or "Phone: +62 812-3456-7890"
        phone = ariaLabel.replace(/^(Telepon|Phone):\s*/i, "").trim();
      } else {
        phone = (await phoneLoc.textContent()) || null;
        if (phone) phone = phone.replace(/^[^+\d]+/, "").trim();
      }
    }
  } catch (e) {
    console.log("Could not extract phone");
  }

  // 6. Extract website (stable data-item-id)
  let website: string | null = null;
  try {
    const webLoc = page.locator("[data-item-id='authority']").first();
    if (await webLoc.isVisible()) {
      // Get the real href, not just the displayed text
      const href = await webLoc.getAttribute("href");
      if (href) {
        website = href;
      } else {
        website = (await webLoc.textContent()) || null;
        if (website) website = website.trim();
      }
    }
  } catch (e) {
    console.log("Could not extract website");
  }

  // 7. Extract Instagram URL
  let instagramUrl: string | null = null;
  try {
    // Check if there's any social media link directly in Google Maps details (sometimes present as button/link)
    const igLink = page.locator("a[href*='instagram.com']").first();
    if (await igLink.isVisible()) {
      instagramUrl = await igLink.getAttribute("href");
    }
  } catch (e) {
    console.log("Could not extract instagram from maps page");
  }

  // If website exists but instagram was not found in Maps, try crawling their website!
  if (website && !instagramUrl) {
    console.log(`Attempting to find Instagram on website: ${website}`);
    instagramUrl = await findInstagramFromWebsite(website);
    if (instagramUrl) {
      console.log(`Successfully found Instagram link: ${instagramUrl}`);
    }
  }

  return {
    name,
    address,
    phone,
    website,
    rating,
    reviewCount,
    category,
    instagramUrl,
  };
}
