import { useState, useEffect } from "react";
import { Upload, Car, DollarSign, FileText, BarChart3, Activity, Lightbulb, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "../utils/supabaseClient";
import { formatINR } from "../utils/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalLiability: 0,
        contractsCount: 0,
        avgFairnessScore: 0,
        recentActivities: 0
    });
    const [recentContracts, setRecentContracts] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch all analyses for the user
            const { data: analyses, error } = await supabase
                .from('analyses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (analyses && analyses.length > 0) {
                // Calculate statistics
                const totalLiability = analyses.reduce((sum, a) => 
                    sum + (a.monthly_payment || 0) * (a.lease_term_months || 36), 0
                );
                const avgScore = analyses.reduce((sum, a) => 
                    sum + (a.fairness_score || 0), 0
                ) / analyses.length;

                setStats({
                    totalLiability,
                    contractsCount: analyses.length,
                    avgFairnessScore: Math.round(avgScore),
                    recentActivities: analyses.filter(a => {
                        const createdDate = new Date(a.created_at);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return createdDate >= weekAgo;
                    }).length
                });

                // Get recent 3 contracts
                setRecentContracts(analyses.slice(0, 3).map(a => ({
                    id: a.id,
                    name: a.vehicle_name || `${a.vehicle_year} ${a.vehicle_make} ${a.vehicle_model}`,
                    date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    status: "Analyzed",
                    statusColor: "default"
                })));
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = [
        { title: "Total Liability", value: formatINR(stats.totalLiability) || "₹0", icon: DollarSign, change: "Total contract value" },
        { title: "Contracts Analyzed", value: stats.contractsCount.toString(), icon: FileText, change: `${stats.recentActivities} this week` },
        { title: "Avg Fairness Score", value: `${stats.avgFairnessScore}/100`, icon: BarChart3, change: stats.avgFairnessScore >= 70 ? "Above average" : "Below average" },
        { title: "Recent Activities", value: stats.recentActivities.toString(), icon: Activity, change: "Last 7 days" },
    ];

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }
    return (
        <div className="space-y-8 pb-12">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
                <Button size="lg" className="gap-2" asChild>
                    <Link to="/analysis">
                        <Upload className="h-5 w-5" /> Upload New Contract
                    </Link>
                </Button>
                <Button variant="secondary" size="lg" className="gap-2" asChild>
                    <Link to="/vin-lookup">
                        <Car className="h-4 w-4" /> VIN Lookup
                    </Link>
                </Button>
            </div>

            {/* Metric Cards */}
            <motion.div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                variants={container}
                initial="hidden"
                animate="show"
            >
                {metrics.map((m) => (
                    <motion.div key={m.title} variants={item}>
                        <Card className="transition-shadow hover:shadow-md cursor-default">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
                                <m.icon className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{m.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">{m.change}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* Recent Contracts */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Recent Contracts</CardTitle>
                    {recentContracts.length > 0 && (
                        <Button variant="link" size="sm" asChild>
                            <Link to="/contracts">View All</Link>
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-3">
                    {recentContracts.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No contracts analyzed yet</p>
                            <Button className="mt-4" asChild>
                                <Link to="/analysis">Upload Your First Contract</Link>
                            </Button>
                        </div>
                    ) : (
                        recentContracts.map((c) => (
                            <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <span className="text-sm font-medium">{c.name}</span>
                                        <p className="text-xs text-muted-foreground">{c.date}</p>
                                    </div>
                                    <Badge variant={c.statusColor}>{c.status}</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link to="/contracts">View</Link>
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
