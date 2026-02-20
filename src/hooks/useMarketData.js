
import { useState } from 'react';

const MARKETCHECK_API_KEY = import.meta.env.VITE_MARKETCHECK_API_KEY;
const API_BASE_URL = 'https://api.marketcheck.com/v2';

export const useMarketData = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [marketData, setMarketData] = useState(null);

    const fetchMarketData = async (vin, miles = 50000) => {
        setLoading(true);
        setError(null);
        try {
            // Validate VIN before API call
            if (!vin || vin.length !== 17 || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
                throw new Error(`Invalid VIN format: ${vin}. VIN must be exactly 17 alphanumeric characters.`);
            }
            
            // Additional check for known invalid patterns
            const invalidPatterns = ['AUT0LEASE', 'S0LUT', 'C0NTRACT', 'AGREEM'];
            if (invalidPatterns.some(pattern => vin.toUpperCase().includes(pattern))) {
                throw new Error(`VIN appears to be invalid: ${vin}. Please check the document for the correct VIN.`);
            }
            
            // 1. Decode VIN
            console.log(`Decoding VIN: ${vin}`);
            const decodeResponse = await fetch(`${API_BASE_URL}/decode/car/${vin}/specs?api_key=${MARKETCHECK_API_KEY}`);
            if (!decodeResponse.ok) throw new Error('Failed to decode VIN');
            const specs = await decodeResponse.json();
            console.log('Decoded Specs:', specs);

            const { year, make, model, trim } = specs;

            // 2. Search Active Listings (Optional but requested)
            let activeListings = null;
            try {
                const searchParams = new URLSearchParams({
                    api_key: MARKETCHECK_API_KEY,
                    year: year?.toString() || '',
                    make: make || '',
                    model: model || '',
                    rows: '20', // Fetch more to filter out 0 prices
                    sort_by: 'price',
                    sort_order: 'desc' // Try desc to get priced ones first? Or just filter client side.
                });
                const searchResponse = await fetch(`${API_BASE_URL}/search/car/active?${searchParams}`);
                if (searchResponse.ok) {
                    const rawData = await searchResponse.json();
                    if (rawData.listings) {
                        // FILTER: Only keep listings with a valid price > 0
                        const validListings = rawData.listings.filter(l => l.price && !isNaN(l.price) && Number(l.price) > 0);
                        activeListings = {
                            ...rawData,
                            num_found: validListings.length, // Update count to reflect valid ones
                            listings: validListings
                        };
                        console.log('Valid Active Listings:', activeListings);
                    }
                }
            } catch (searchErr) {
                console.warn("Active listings search failed:", searchErr);
            }

            // 3. Predict Price
            let prediction = null;
            try {
                const predictParams = new URLSearchParams({
                    api_key: MARKETCHECK_API_KEY,
                    year: year?.toString() || '',
                    make: make || '',
                    model: model || '',
                    trim: trim || '',
                    miles: miles.toString(),
                    car_type: 'used'
                });

                const predictResponse = await fetch(`${API_BASE_URL}/predict/car/price?${predictParams}`);
                if (predictResponse.ok) {
                    prediction = await predictResponse.json();
                    console.log('Price Prediction:', prediction);
                } else {
                    console.warn(`Price prediction failed: ${predictResponse.statusText}`);
                }
            } catch (predictErr) {
                console.warn("Price prediction error:", predictErr);
            }

            // Construct final result
            const result = {
                specs,
                active_listings: activeListings, // New field
                prediction
            };

            setMarketData(result);
            return result;

        } catch (err) {
            console.error(err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { fetchMarketData, marketData, loading, error };
};
