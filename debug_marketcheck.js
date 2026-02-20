
const apiKey = 'nC1fHaNWGgHpObiUsJnmTROChkAZvtmw';
const url = `https://api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&year=2003&make=Honda&model=Accord&rows=2&sort_by=price&sort_order=asc`;

async function fetchListings() {
    try {
        console.log(`Fetching from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.listings) {
            console.log("Found listings:", data.listings.length);
            data.listings.slice(0, 3).forEach((l, i) => {
                console.log(`Listing ${i}:`, {
                    heading: l.heading,
                    price: l.price,
                    price_type: typeof l.price,
                    ref_price: l.ref_price,
                    msrp: l.msrp
                });
            });
        } else {
            console.log("No listings found in response key 'listings'");
            console.log("Keys:", Object.keys(data));
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

fetchListings();
