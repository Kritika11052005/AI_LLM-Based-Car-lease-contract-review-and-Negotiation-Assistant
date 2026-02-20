import { useState, useEffect } from "react";
import { Search, Trash2, Eye, BarChart3, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { formatINR } from "../utils/currency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function MyContracts() {
    const [contracts, setContracts] = useState([]);
    const [filteredContracts, setFilteredContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        fetchContracts();
    }, []);

    useEffect(() => {
        filterContracts();
    }, [searchTerm, statusFilter, contracts]);

    const fetchContracts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('analyses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedContracts = data.map(a => ({
                    id: a.id,
                    name: a.vehicle_name || `${a.vehicle_year || ''} ${a.vehicle_make || ''} ${a.vehicle_model || 'Unknown Vehicle'}`.trim(),
                    date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    status: "Analyzed",
                    vehicle: `${a.vehicle_make || ''} ${a.vehicle_model || ''}`.trim() || "Unknown",
                    color: "default",
                    fairnessScore: a.fairness_score || 0,
                    monthlyPayment: a.monthly_payment || 0,
                    leaseTerm: a.lease_term_months || 36
                }));
                setContracts(formattedContracts);
            }
        } catch (error) {
            console.error("Error fetching contracts:", error);
        } finally {
            setLoading(false);
        }
    };

    const filterContracts = () => {
        let filtered = [...contracts];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter (currently all are "Analyzed", but keeping for future expansion)
        if (statusFilter !== "all") {
            filtered = filtered.filter(c => c.status.toLowerCase() === statusFilter);
        }

        setFilteredContracts(filtered);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this contract?")) return;

        try {
            const { error } = await supabase
                .from('analyses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setContracts(contracts.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting contract:", error);
            alert("Failed to delete contract. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        placeholder="Search contracts..." 
                        className="pl-9" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="analyzed">Analyzed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Contracts List */}
            <div className="space-y-3">
                {filteredContracts.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">
                                {contracts.length === 0 ? "No contracts found" : "No contracts match your search"}
                            </p>
                            {contracts.length === 0 && (
                                <Button asChild>
                                    <Link to="/analysis">Upload Your First Contract</Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    filteredContracts.map((c) => (
                        <Card key={c.id} className="transition-shadow hover:shadow-md">
                            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                    <div>
                                        <p className="font-medium text-sm">{c.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {c.vehicle} · {c.date} · Score: {c.fairnessScore}/100
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={c.color}>{c.status}</Badge>
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        title="Delete Contract"
                                        onClick={() => handleDelete(c.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
