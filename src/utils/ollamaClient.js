
/**
 * Ollama Local Client
 * 
 * Connects to a local Ollama instance running at http://localhost:11434.
 * Ensure Ollama is running with `OLLAMA_ORIGINS="*"` to allow browser requests.
 */

const OLLAMA_URL = 'http://localhost:11434/api/chat';
// You can change this to 'mistral', 'gemma', etc. depending on what you have pulled.
const MODEL_NAME = 'mistral:latest';

export const analyzeWithOllama = async (text) => {
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                stream: false, // We want the full JSON at once for simplicity
                format: 'json', // Enforce JSON output mode (supported by modern Ollama versions)
                messages: [
                    {
                        role: 'system',
                        content: `You are a contract analysis assistant. Extract the following fields from the car lease contract.

CRITICAL VIN EXTRACTION RULES:
- vin: This is a 17-character Vehicle Identification Number that uniquely identifies the vehicle
- Look for labels like "VIN:", "VIN#", "Vehicle Identification Number:", "Vehicle ID:", or "Identification No:"
- A valid VIN is 17 characters: numbers (0-9) and capital letters (A-Z), but NEVER uses I, O, or Q
- Example format: 1HGCM82633A004352, 5FNRL5H40GB123456
- DO NOT extract company names, headers, or watermarks as VINs (e.g., "AUTO LEASES SOLUTION" is NOT a VIN)
- If you cannot find a clearly labeled VIN, return null - do NOT guess

OTHER VEHICLE INFO:
- vehicle_make: Car manufacturer (Honda, Toyota, Ford, etc.). Look in vehicle description section.
- vehicle_model: Car model name (Accord, Camry, F-150, etc.). Look in vehicle description section.
- vehicle_year: 4-digit year (2020, 2021, etc.). Look in vehicle description section.

CRITICAL PRICE EXTRACTION:
- capitalized_cost: MOST IMPORTANT - This is the vehicle price (should be in thousands)
  * Look for these labels: "Capitalized Cost", "Gross Cap Cost", "Agreed Upon Value", "Vehicle Price", "Selling Price", "Purchase Price"
  * Usually appears in the first 1-2 pages in a pricing section or vehicle details section
  * This is typically the LARGEST dollar amount in the contract (e.g., $21,950, $35,000)
  * DO NOT confuse with monthly payment, down payment, or residual value
  * Extract just the number without $ or commas (e.g., 21950 not "$21,950")
  * Always search for this field - it's required for analysis

FINANCIAL TERMS:
- apr: Annual percentage rate or money factor (convert money factor × 2400 if needed).
- lease_term_months: Total lease duration in months (usually 24, 36, 48).
- monthly_payment: Monthly lease payment amount.
- down_payment: Upfront payment, "Cap Cost Reduction", or "Initial Payment".
- residual_value: End-of-lease buyout price or "Residual Amount".
- mileage_allowance: Annual or total mileage limit (e.g., "12,000 per year" or "36,000 total").

CLAUSES:
- early_termination_clause: Early termination fees and rules.
- purchase_option: Can lessee buy the vehicle at lease end? How?
- late_fees: Late payment penalties.
- risk_clauses: High-risk clauses like arbitration or warranty limitations.
- hidden_fees: Document fees, acquisition fees, disposition fees.
- savings_opportunity: Negotiation points or overpriced items.

IMPORTANT: 
- If you find the VIN anywhere in the text, extract it. It's typically 17 alphanumeric characters.
- Search thoroughly before returning null for vin, vehicle_make, vehicle_model, vehicle_year, or capitalized_cost.
- Extract EXACT numbers, don't round unless necessary.

Return ONLY valid JSON with exactly these keys:
{
  "apr": number or null,
  "lease_term_months": number or null,
  "monthly_payment": number or null,
  "down_payment": number or null,
  "residual_value": number or null,
  "mileage_allowance": string or null,
  "early_termination_clause": string or null,
  "purchase_option": string or null,
  "late_fees": string or null,
  "vin": string or null,
  "vehicle_make": string or null,
  "vehicle_model": string or null,
  "vehicle_year": number or null,
  "capitalized_cost": number or null,
  "risk_clauses": string or null,
  "hidden_fees": string or null,
  "savings_opportunity": string or null
}`
                    },
                    {
                        role: 'user',
                        content: text.length > 8000 ? text.substring(0, 8000) + "\n...[Truncated]..." : text
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // Parse the 'message.content' which should be a JSON string
        try {
            if (!data.message || !data.message.content) {
                console.error("Unexpected Ollama response format:", data);
                return { error: "Invalid Response Format", raw: data };
            }
            return JSON.parse(data.message.content);
        } catch (e) {
            console.warn("Failed to parse Ollama output as JSON, returning raw text", e);
            console.log("Raw Content that failed parse:", data.message.content);
            return { raw_content: data.message.content };
        }

    } catch (error) {
        console.error("Ollama Connection Failed:", error);
        throw new Error("Failed to connect to Ollama. Is it running with OLLAMA_ORIGINS='*'? \n\nCommand: `set OLLAMA_ORIGINS=\"*\" && ollama serve`");
    }
};

export const chatWithOllama = async (messages) => {
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL_NAME,
                stream: false,
                messages: messages
            })
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);

        const data = await response.json();
        return data.message.content;
    } catch (error) {
        console.error("Chat Error:", error);
        throw error;
    }
};
