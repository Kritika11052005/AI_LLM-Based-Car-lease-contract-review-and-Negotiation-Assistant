# ContractCoach - AI-Powered Car Lease Analysis Platform

ContractCoach is an intelligent web application that helps users analyze car lease contracts, compare market prices, and make informed decisions using AI-powered insights.

## Features

- 📄 **Contract Analysis**: Upload and analyze car lease contracts with OCR technology
- 🤖 **AI Assistant**: Chat with an AI assistant powered by Ollama for contract insights
- 🔍 **VIN Lookup**: Get real-time market data and vehicle information using VIN numbers
- 📊 **Dashboard**: Track all your contracts and their fairness scores
- 💰 **Price Comparison**: Compare dealer prices with market averages
- ⚖️ **Fairness Scoring**: Get objective fairness scores for your contracts
- 🌓 **Dark Mode**: Toggle between light and dark themes
- 🔐 **Authentication**: Secure user authentication with Supabase

## Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS, Radix UI Components
- **Authentication**: Supabase Auth
- **Database**: Supabase
- **AI/ML**: Ollama (local), OpenRouter (optional)
- **APIs**: MarketCheck API for vehicle data
- **Charts**: Recharts, Chart.js
- **OCR**: Tesseract.js, PDF.js

## Prerequisites

- Node.js 18+ and npm
- Ollama installed locally (for AI features)
- Supabase account (free tier works)
- MarketCheck API key (for VIN lookup)

## Installation

1. **Clone the repository**
   ```bash
   cd car-lease-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory and add your configuration:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your actual credentials:
   - Get Supabase credentials from: https://supabase.com
   - Get MarketCheck API key from: https://www.marketcheck.com
   - OpenRouter is optional if you're using local Ollama

4. **Set up Supabase Database**
   
   Create the following table in your Supabase project:
   
   ```sql
   CREATE TABLE analyses (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     vehicle_name TEXT,
     vehicle_year INTEGER,
     vehicle_make TEXT,
     vehicle_model TEXT,
     vin TEXT,
     fairness_score INTEGER,
     monthly_payment DECIMAL,
     lease_term_months INTEGER,
     market_data JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

   -- Create policy to allow users to see only their own data
   CREATE POLICY "Users can view their own analyses"
     ON analyses FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert their own analyses"
     ON analyses FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can delete their own analyses"
     ON analyses FOR DELETE
     USING (auth.uid() = user_id);
   ```

5. **Set up Ollama (for AI features)**
   
   Install Ollama from: https://ollama.ai
   
   Then run:
   ```bash
   # Start Ollama with CORS enabled
   OLLAMA_ORIGINS="*" ollama serve
   
   # In another terminal, pull the Mistral model
   ollama pull mistral:latest
   ```

## Running the Application

1. **Development mode**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

2. **Build for production**
   ```bash
   npm run build
   ```

3. **Preview production build**
   ```bash
   npm run preview
   ```

## Project Structure

```
car-lease-app/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Radix UI components
│   │   ├── Auth.jsx      # Authentication component
│   │   └── Layout.jsx    # Main layout with sidebar
│   ├── pages/            # Main application pages
│   │   ├── Dashboard.jsx
│   │   ├── Analysis.jsx
│   │   ├── MyContracts.jsx
│   │   ├── VinLookup.jsx
│   │   ├── AiAssistant.jsx
│   │   └── Settings.jsx
│   ├── hooks/            # Custom React hooks
│   │   └── useMarketData.js
│   ├── utils/            # Utility functions
│   │   ├── supabaseClient.js
│   │   ├── ollamaClient.js
│   │   ├── openRouterClient.js
│   │   ├── fairnessScore.js
│   │   ├── currency.js
│   │   └── ocr.js
│   ├── App.jsx           # Main app component
│   └── main.jsx          # Entry point
├── public/               # Static assets
└── package.json
```

## Usage Guide

### 1. First Time Setup
- Create an account or sign in
- Configure your preferences in Settings

### 2. Analyzing a Contract
- Go to "Contract Analysis" page
- Upload a PDF or image of your car lease contract
- Wait for the AI to extract key terms
- Review the fairness score and market comparison

### 3. VIN Lookup
- Navigate to "VIN Lookup"
- Enter a Vehicle Identification Number
- Get real-time market data and pricing information

### 4. AI Assistant
- Go to "AI Assistant" page
- Select a contract from the dropdown (optional)
- Ask questions about contracts, pricing, or negotiations
- Get AI-powered insights powered by Ollama

### 5. Managing Contracts
- View all your analyzed contracts in "My Contracts"
- Search and filter contracts
- Delete contracts you no longer need

## Configuration

### Dark Mode
Toggle dark mode in Settings or using the theme button in the header.

### Currency
Change your preferred currency (INR, USD, EUR) in Settings.

### Notifications
Enable/disable email notifications in Settings.

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Make sure CORS is enabled: `OLLAMA_ORIGINS="*"`
- Check if the model is downloaded: `ollama list`

### Supabase Errors
- Verify your `.env` file has correct credentials
- Check if Row Level Security policies are set up
- Ensure the `analyses` table exists

### MarketCheck API Issues
- Verify your API key is valid
- Check rate limits on your account
- Some VINs may not have data available

## Contributing

This is a private project, but suggestions and bug reports are welcome!

## License

All rights reserved.

## Support

For issues or questions, please open an issue in the repository.
