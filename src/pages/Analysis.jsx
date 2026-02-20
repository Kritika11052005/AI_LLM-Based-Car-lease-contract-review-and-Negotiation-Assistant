import { useState, useRef } from 'react';
import { extractTextFromPDF } from '../utils/ocr';
import { analyzeWithOllama } from '../utils/ollamaClient';
import { useMarketData } from '../hooks/useMarketData';
import { calculateFairnessScore } from '../utils/fairnessScore';
import { convertToINR, formatINR } from '../utils/currency';
import { Upload, DollarSign, TrendingDown, Percent, BarChart3, ShieldAlert, FileSearch, AlertTriangle, Lightbulb, Target, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '../utils/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analysis() {
    const [file, setFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, ocr, analyzing, market, complete
    const [fairness, setFairness] = useState(null);
    const fileInputRef = useRef(null);

    const { fetchMarketData, marketData } = useMarketData();

    const normalizeLLMResponse = (data) => {
        if (!data) return null;
        if (data.vin || data.VIN || data.Vin || data.lease_term_months || data.apr) return data;
        if (data.answer) {
            if (typeof data.answer === 'object') return normalizeLLMResponse(data.answer);
            try { return normalizeLLMResponse(JSON.parse(data.answer)); } catch (e) { }
        }
        return data;
    };

    const normalizeVinCandidate = (value) => {
        if (!value) return null;
        const trimmed = value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (trimmed.length !== 17) return null;
        const normalized = trimmed
            .replace(/O/g, '0')
            .replace(/I/g, '1')
            .replace(/Q/g, '0');
        return normalized;
    };

    const isValidVin = (vin) => {
        if (!vin || vin.length !== 17) return false;
        if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;

        // Filter out common false positives
        const invalid = [
            'AUT0LEASES0LUT10N',
            'CONTRACTC0ACH0000',
            'AUTOLEASES0LUT10N',
            'AUT0LEASESS0LUT10N',
            'C0NTRACTC0ACH000',
            '00000000000000000',
            '11111111111111111',
            'XXXXXXXXXXXXXXXXX',
            'ZZZZZZZZZZZZZZZZZ'
        ];
        if (invalid.includes(vin.toUpperCase())) return false;

        // VINs should not be all the same character
        if (/^(.)\1+$/.test(vin)) return false;

        // VINs should have variation (at least 8 unique characters)
        const uniqueChars = new Set(vin.split('')).size;
        if (uniqueChars < 8) return false;

        // VINs shouldn't spell obvious words or patterns
        const words = ['SOLUTION', 'S0LUT', 'CONTRACT', 'C0NTRACT', 'AUTOLEASE', 'AUT0LEASE', 'AGREEMENT', 'AGREEM', 'LEASES', 'LEASS'];
        const upperVin = vin.toUpperCase();
        for (const word of words) {
            if (upperVin.includes(word)) return false;
        }

        // Check VIN structure: First char must be number or letter (country code)
        // Position 10 must be a year code (letter or number)
        const yearCodes = 'ABCDEFGHJKLMNPRSTVWXY123456789';
        if (!yearCodes.includes(vin.charAt(9))) return false;

        return true;
    };

    const extractVinFromText = (text) => {
        if (!text) return null;
        const upper = text.toUpperCase();

        // Try to find VIN with explicit label first (most reliable)
        const patterns = [
            /VIN[:\s#-]*([A-Z0-9OIQ\-\s]{17,25})/i,
            /VEHICLE\s+IDENTIFICATION\s+NUMBER[:\s#-]*([A-Z0-9OIQ\-\s]{17,25})/i,
            /V\.I\.N[:\s#-]*([A-Z0-9OIQ\-\s]{17,25})/i,
            /VIN\s*#[:\s]*([A-Z0-9OIQ\-\s]{17,25})/i,
            /IDENTIFICATION\s+NO[:\s.#-]*([A-Z0-9OIQ\-\s]{17,25})/i
        ];

        for (const pattern of patterns) {
            const match = upper.match(pattern);
            if (match?.[1]) {
                const candidate = normalizeVinCandidate(match[1]);
                console.log('VIN candidate from labeled pattern:', candidate);
                if (candidate && isValidVin(candidate)) {
                    console.log('✓ Valid VIN found:', candidate);
                    return candidate;
                } else {
                    console.log('✗ Invalid VIN from pattern:', candidate);
                }
            }
        }

        // Fallback: scan for 17-char sequences, but be more strict
        const candidates = upper.match(/[A-Z0-9OIQ]{17}/g) || [];
        console.log('VIN candidates from text scan:', candidates.slice(0, 5));

        for (const raw of candidates) {
            const candidate = normalizeVinCandidate(raw);
            if (candidate && isValidVin(candidate)) {
                console.log('✓ Valid VIN found from scan:', candidate);
                return candidate;
            } else {
                console.log('✗ Invalid VIN candidate:', candidate);
            }
        }

        console.warn('⚠ No valid VIN found in document text');
        return null;
    };

    const cleanVin = (value) => {
        if (!value) return null;
        const textValue = value.toString().trim();
        const lower = textValue.toLowerCase();
        if (
            lower === 'not provided' ||
            lower === 'notprovided' ||
            lower === 'n/a' ||
            lower === 'na' ||
            lower === 'none'
        ) {
            return null;
        }
        const candidate = normalizeVinCandidate(textValue);
        return isValidVin(candidate) ? candidate : null;
    };

    const parseCurrencyValue = (value) => {
        if (!value) return null;
        const normalized = value.toString().replace(/,/g, '').trim();
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const extractCapitalizedCostFromText = (text) => {
        if (!text) return null;
        const patterns = [
            /capitalized\s+cost[^0-9$]*\$?\s*([0-9,]+(?:\.[0-9]+)?)/i,
            /agreed\s+value[^0-9$]*\$?\s*([0-9,]+(?:\.[0-9]+)?)/i,
            /selling\s+price[^0-9$]*\$?\s*([0-9,]+(?:\.[0-9]+)?)/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match?.[1]) {
                const parsed = parseCurrencyValue(match[1]);
                if (parsed) return parsed;
            }
        }
        return null;
    };

    const getMarketPriceFromData = (data) => {
        if (!data) return 0;
        if (data?.prediction?.predicted_price) return data.prediction.predicted_price;
        if (data?.prediction?.price_range?.lower_bound && data?.prediction?.price_range?.upper_bound) {
            return (data.prediction.price_range.lower_bound + data.prediction.price_range.upper_bound) / 2;
        }
        if (data?.active_listings?.listings?.length > 0) {
            const prices = data.active_listings.listings
                .map((l) => Number(l.price) || 0)
                .filter((p) => p > 0);
            if (prices.length > 0) return prices.reduce((a, b) => a + b, 0) / prices.length;
        }
        return 0;
    };

    const handleFileUpload = async (event) => {
        const uploadedFile = event.target.files[0];
        if (!uploadedFile) return;

        console.log('File selected:', uploadedFile.name);
        setFile(uploadedFile);
        setStatus('ocr');

        try {
            console.log('Starting OCR extraction...');
            const text = await extractTextFromPDF(uploadedFile);
            console.log('OCR extraction complete. Text length:', text.length);
            setExtractedText(text);

            if (!text || text.length < 50) {
                throw new Error('Could not extract enough text from the document. Please ensure it\'s a valid contract.');
            }

            setStatus('analyzing');
            console.log('Starting LLM analysis...');
            const rawLlmResult = await analyzeWithOllama(text);
            console.log('LLM raw result:', rawLlmResult);
            const llmResult = normalizeLLMResponse(rawLlmResult) || {};
            console.log('LLM normalized result:', llmResult);

            const fallbackVin = extractVinFromText(text);
            const fallbackCapitalizedCost = extractCapitalizedCostFromText(text);

            // Clean and validate LLM-extracted VIN
            const llmVin = cleanVin(llmResult?.vin || llmResult?.VIN || llmResult?.Vin);
            const detectedVin = llmVin || fallbackVin;
            const detectedCapitalizedCost = llmResult?.capitalized_cost || llmResult?.agreed_value || fallbackCapitalizedCost;

            console.log('🔍 VIN Extraction Results:');
            console.log('  - Raw LLM VIN:', llmResult?.vin || llmResult?.VIN || llmResult?.Vin);
            console.log('  - Cleaned LLM VIN:', llmVin);
            console.log('  - Fallback VIN from text:', fallbackVin);
            console.log('  - Final detected VIN:', detectedVin);
            console.log('💰 Cost Extraction:');
            console.log('  - LLM cost:', llmResult?.capitalized_cost);
            console.log('  - Fallback cost:', fallbackCapitalizedCost);
            console.log('  - Final cost:', detectedCapitalizedCost);

            const enhancedResult = { ...llmResult };
            if (detectedVin) enhancedResult.vin = detectedVin;
            if (detectedCapitalizedCost) enhancedResult.capitalized_cost = detectedCapitalizedCost;
            setAnalysis(enhancedResult);

            // Double-check VIN validity before making API call
            const vin = detectedVin && isValidVin(detectedVin) ? detectedVin : null;

            if (!vin) {
                console.error('❌ No valid VIN found. Cannot fetch market data.');
                setStatus('complete');
                return;
            }

            if (vin) {
                setStatus('market');
                const marketResult = await fetchMarketData(vin, llmResult.mileage_limit || 12000);

                if (marketResult?.specs) {
                    enhancedResult.vehicle_year = enhancedResult.vehicle_year || marketResult.specs.year;
                    enhancedResult.vehicle_make = enhancedResult.vehicle_make || marketResult.specs.make;
                    enhancedResult.vehicle_model = enhancedResult.vehicle_model || marketResult.specs.model;
                    setAnalysis({ ...enhancedResult });
                }

                const marketPrice = getMarketPriceFromData(marketResult);
                console.log('Final market price (USD):', marketPrice);

                if (marketPrice > 0) {
                    const dealerPriceINR = convertToINR(enhancedResult.capitalized_cost || 0);
                    const marketPriceINR = convertToINR(marketPrice);

                    const score = calculateFairnessScore({
                        price: dealerPriceINR,
                        marketAvg: marketPriceINR,
                        apr: llmResult.apr || 0,
                        fees: 0,
                        term: llmResult.lease_term_months || 36
                    });
                    setFairness(score);

                    // Save to Supabase
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { error } = await supabase.from('analyses').insert([{
                            user_id: user.id,
                            vehicle_name: `${enhancedResult.vehicle_year || ''} ${enhancedResult.vehicle_make || ''} ${enhancedResult.vehicle_model || 'Unknown Vehicle'}`.trim(),
                            fairness_score: score.totalScore || score,
                            monthly_payment: enhancedResult.monthly_payment || 0,
                            lease_term_months: enhancedResult.lease_term_months || 36,
                            vehicle_year: enhancedResult.vehicle_year,
                            vehicle_make: enhancedResult.vehicle_make,
                            vehicle_model: enhancedResult.vehicle_model,
                            vin: vin,
                            market_data: marketResult,
                            contract_data: enhancedResult // Store complete analysis data
                        }]);
                        if (error) console.error("Supabase Save Error:", error);
                    }
                }
            }
            setStatus('complete');
        } catch (error) {
            console.error('Analysis error:', error);
            setStatus('error');

            let errorMessage = 'Analysis failed. ';

            if (error.message.includes('Ollama')) {
                errorMessage += 'Ollama is not running or not accessible. Please start Ollama with:\n\nset OLLAMA_ORIGINS="*" && ollama serve';
            } else if (error.message.includes('extract')) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please check console for details and try again.';
            }

            alert(errorMessage);

            // Reset to allow retry
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setTimeout(() => {
                setStatus('idle');
                setFile(null);
                setAnalysis(null);
            }, 2000);
        }
    };

    // --- Derived Data for UI ---

    // Fallbacks if data is missing
    const dealerPrice = analysis?.capitalized_cost || analysis?.agreed_value ? Number(analysis.capitalized_cost || analysis.agreed_value) : 0;
    const marketPrice = getMarketPriceFromData(marketData);
    const priceDiff = dealerPrice > 0 && marketPrice > 0
        ? ((dealerPrice - marketPrice) / marketPrice * 100).toFixed(1) + '%'
        : 'N/A';

    // Metrics Data
    const topMetrics = [
        { label: "Dealer Price", value: formatINR(convertToINR(dealerPrice)) || "N/A", icon: DollarSign },
        { label: "Market Average", value: formatINR(convertToINR(marketPrice)) || "N/A", icon: TrendingDown },
        { label: "Price Difference", value: priceDiff, icon: Percent },
        { label: "Fairness Score", value: fairness ? `${fairness.totalScore}/100` : "N/A", icon: BarChart3 },
    ];

    // Analysis Cards Data
    const analysisSections = [
        {
            title: "Market Range",
            desc: marketPrice > 0
                ? (dealerPrice > marketPrice * 1.05 ? "Price is above market average." : "Price is competitive.")
                : "Market data unavailable.",
            icon: Target
        },
        {
            title: "Clause Risk",
            desc: analysis?.risk_clauses || "No high-risk clauses detected.",
            icon: ShieldAlert
        },
        {
            title: "SLA Extraction",
            desc: `Term: ${analysis?.lease_term_months || 'N/A'}mo / Fees: ${formatINR(convertToINR(analysis?.monthly_payment)) || 'N/A'}`,
            icon: FileSearch
        },
        {
            title: "Hidden Charges",
            desc: analysis?.hidden_fees || "No hidden charges flagged.",
            icon: AlertTriangle
        },
        {
            title: "Savings Gap",
            desc: analysis?.savings_opportunity || "Negotiate Capitalized Cost.",
            icon: Lightbulb
        },
    ];

    // Chart Data
    const chartData = [
        { name: "Dealer Price", value: dealerPrice > 0 ? convertToINR(dealerPrice) : 0 },
        { name: "Market Avg", value: marketPrice > 0 ? convertToINR(marketPrice) : 0 },
        { name: "Best Price", value: marketPrice > 0 ? convertToINR(marketPrice * 0.95) : 0 },
    ];

    if (status === 'idle') {
        return (
            <div className="space-y-8 max-w-4xl mx-auto pb-12">
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center gap-4 py-12 relative">
                        <div className="rounded-full bg-primary/10 p-4">
                            <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium">Drag & drop your contract here</p>
                            <p className="text-sm text-muted-foreground">or click to browse files (PDF, Images)</p>
                            {file && (
                                <p className="text-sm text-primary mt-2">Selected: {file.name}</p>
                            )}
                        </div>
                        <Button>Upload Contract</Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="space-y-8 max-w-4xl mx-auto pb-12">
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center gap-4 py-12 relative">
                        <div className="rounded-full bg-primary/10 p-4">
                            <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium">Drag & drop your contract here</p>
                            <p className="text-sm text-muted-foreground">or click to browse files (PDF, Images)</p>
                        </div>
                        <Button>Upload Contract</Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </CardContent>
                </Card>

                <Card className="border-destructive bg-destructive/5">
                    <CardContent className="py-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-destructive">Analysis Failed</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Please check that:
                                </p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                                    <li>The file is a valid PDF or image</li>
                                    <li>Ollama is running (run: <code className="bg-slate-100 px-1 rounded">ollama serve</code>)</li>
                                    <li>Your browser console for detailed errors</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status !== 'complete' && status !== 'idle') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-800">Analyzing Contract...</h3>
                    <p className="text-slate-500 mt-2">
                        {status === 'ocr' && "Reading document... This may take a minute for large PDFs."}
                        {status === 'analyzing' && "Extracting terms & clauses..."}
                        {status === 'market' && "Comparing with market prices..."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Top Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {topMetrics.map((m) => (
                    <Card key={m.label} className="transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
                            <m.icon className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{m.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Analysis Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {analysisSections.map((s) => (
                    <Card key={s.title} className="transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center gap-3 pb-2">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <s.icon className="h-4 w-4 text-primary" />
                            </div>
                            <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{s.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Dealer vs Market Price</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 w-full min-h-64">
                            <ResponsiveContainer width="100%" height={256}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="name" className="text-xs" />
                                    <YAxis className="text-xs" tickFormatter={(val) => `₹${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => formatINR(value)}
                                    />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        setStatus('idle');
                        setAnalysis(null);
                        setFile(null);
                        setFairness(null);
                        setExtractedText('');
                    }}
                >
                    Analyze Another Contract
                </Button>
            </div>
        </div>
    );
}
