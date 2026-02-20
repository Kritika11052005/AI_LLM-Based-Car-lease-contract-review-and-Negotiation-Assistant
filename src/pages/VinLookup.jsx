import { useState } from "react";
import { Search, Car, DollarSign, ShieldAlert, BarChart3, Loader2, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useMarketData } from "../hooks/useMarketData";
import { convertToINR, formatINR } from "../utils/currency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VinLookup() {
    const [vin, setVin] = useState("");
    const [searchedVin, setSearchedVin] = useState("");
    const { fetchMarketData, marketData, loading, error } = useMarketData();

    const handleSearch = async () => {
        if (!vin.trim()) return;
        setSearchedVin(vin);
        await fetchMarketData(vin.trim(), 50000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Process market data for display
    const getVehicleDetails = () => {
        if (!marketData?.specs) return null;
        const { year, make, model, trim, body_type, fuel_type } = marketData.specs;
        return {
            title: "Vehicle Details",
            icon: Car,
            lines: [
                `${year || ''} ${make || ''} ${model || ''}`.trim() || 'Unknown Vehicle',
                `${body_type || 'Unknown'} · ${fuel_type || 'Unknown'}`,
                `VIN: ${searchedVin}`
            ]
        };
    };

    const getMarketPrice = () => {
        if (!marketData) return null;
        
        let avgPrice = 0;
        let minPrice = 0;
        let maxPrice = 0;

        if (marketData.prediction?.price) {
            avgPrice = convertToINR(marketData.prediction.price);
        } else if (marketData.active_listings?.listings?.length > 0) {
            const prices = marketData.active_listings.listings
                .map(l => Number(l.price) || 0)
                .filter(p => p > 0);
            if (prices.length > 0) {
                avgPrice = convertToINR(prices.reduce((a, b) => a + b, 0) / prices.length);
                minPrice = convertToINR(Math.min(...prices));
                maxPrice = convertToINR(Math.max(...prices));
            }
        }

        return {
            title: "Market Price",
            icon: DollarSign,
            lines: [
                avgPrice > 0 ? `Average: ${formatINR(avgPrice)}` : 'Price data unavailable',
                minPrice > 0 && maxPrice > 0 ? `Range: ${formatINR(minPrice)} – ${formatINR(maxPrice)}` : 'Range not available',
                avgPrice > 0 ? 'Based on current listings' : 'No active listings found'
            ]
        };
    };

    const getRiskIndicator = () => {
        return {
            title: "Risk Indicator",
            icon: ShieldAlert,
            lines: [
                "Overall Risk: Low",
                "Check detailed report",
                "Verify title history"
            ]
        };
    };

    const getPriceComparison = () => {
        if (!marketData?.prediction?.price) return null;
        
        const avgPrice = convertToINR(marketData.prediction.price);
        const recommendedMax = avgPrice * 1.03;

        return {
            title: "Price Comparison",
            icon: BarChart3,
            lines: [
                `Average: ${formatINR(avgPrice)}`,
                "Compare with dealer price",
                `Recommended max: ${formatINR(recommendedMax)}`
            ]
        };
    };

    // Generate price history from active listings
    const getPriceHistory = () => {
        if (!marketData?.active_listings?.listings?.length) return [];
        
        const listings = marketData.active_listings.listings.slice(0, 6);
        return listings.map((listing, idx) => ({
            month: `Listing ${idx + 1}`,
            price: convertToINR(listing.price || 0)
        }));
    };

    const resultCards = [
        getVehicleDetails(),
        getMarketPrice(),
        getRiskIndicator(),
        getPriceComparison()
    ].filter(Boolean);

    const priceHistory = getPriceHistory();

    return (
        <div className="space-y-8 pb-12">
            {/* Input */}
            <Card>
                <CardContent className="flex gap-3 p-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            placeholder="Enter VIN number (e.g. 1HGBH41JXMN109186)" 
                            className="pl-9"
                            value={vin}
                            onChange={(e) => setVin(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                        />
                    </div>
                    <Button 
                        className="gap-2" 
                        onClick={handleSearch}
                        disabled={loading || !vin.trim()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                            </>
                        ) : (
                            <>
                                <Car className="h-4 w-4" /> Analyze
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <Card className="border-destructive">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <div>
                            <p className="font-medium text-destructive">Analysis Failed</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Result Cards */}
            {marketData && resultCards.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {resultCards.map((c) => (
                        <Card key={c.title} className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                <div className="rounded-lg bg-primary/10 p-2">
                                    <c.icon className="h-4 w-4 text-primary" />
                                </div>
                                <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                {c.lines.map((l, idx) => (
                                    <p key={idx} className="text-sm text-muted-foreground">{l}</p>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Price History Chart */}
            {marketData && priceHistory.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Active Listings Price Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={priceHistory}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                    <XAxis dataKey="month" className="text-xs" />
                                    <YAxis className="text-xs" tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                        }}
                                        formatter={(value) => [formatINR(value), 'Price']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="price"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={{ fill: "hsl(var(--primary))" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!marketData && !loading && !error && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Search className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">Enter a VIN number to get started</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
