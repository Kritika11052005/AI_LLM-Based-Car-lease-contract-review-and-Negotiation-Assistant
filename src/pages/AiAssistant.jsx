import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL_NAME = 'mistral:latest';

export default function AiAssistant() {
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            text: "Hello! I'm your ContractCoach AI assistant. Select a contract above to discuss it, or ask me anything about vehicle contracts, pricing, or negotiations."
        }
    ]);
    const [input, setInput] = useState('');
    const [contracts, setContracts] = useState([]);
    const [selectedContract, setSelectedContract] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial Messages for Reset
    const initialMessages = [
        {
            role: 'ai',
            text: "Hello! I'm your ContractCoach AI assistant. Select a contract above to discuss it, or ask me anything about vehicle contracts, pricing, or negotiations."
        }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('analyses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                setContracts(data);
            }
        }
    };

    const callOllamaAPI = async (userMessage, contractContext = null) => {
        try {
            let systemPrompt = `You are a helpful AI assistant specializing in car leases and vehicle contracts. 
You help users understand their contracts, negotiate better deals, and make informed decisions.
Provide clear, concise, and actionable advice.`;

            if (contractContext) {
                systemPrompt += `\n\nThe user is asking about this contract:
Vehicle: ${contractContext.vehicle_year} ${contractContext.vehicle_make} ${contractContext.vehicle_model}
Monthly Payment: ${contractContext.monthly_payment || 'N/A'}
Lease Term: ${contractContext.lease_term_months || 'N/A'} months
Fairness Score: ${contractContext.fairness_score || 'N/A'}/100
VIN: ${contractContext.vin || 'N/A'}`;
            }

            const response = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    stream: false,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
        } catch (error) {
            console.error("Ollama API Error:", error);
            return `I'm having trouble connecting to the AI service. Please ensure Ollama is running locally at ${OLLAMA_URL}. Error: ${error.message}`;
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userText = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setInput('');
        setIsTyping(true);

        try {
            const aiResponse = await callOllamaAPI(userText, selectedContract);
            setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
        } catch (error) {
            setMessages(prev => [
                ...prev,
                { role: "ai", text: "Sorry, I encountered an error processing your request. Please try again." }
            ]);
        } finally {
            setIsTyping(false);
        }
    };


    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col">
            {/* Top Bar */}
            <div className="flex items-center gap-3 pb-4">
                <Select
                    value={selectedContract?.id?.toString()}
                    onValueChange={(value) => {
                        const contract = contracts.find(c => c.id.toString() === value);
                        setSelectedContract(contract || null);
                        if (contract) {
                            const vehicleName = `${contract.vehicle_year} ${contract.vehicle_make} ${contract.vehicle_model}`;
                            setMessages(prev => [
                                ...prev,
                                { role: 'ai', text: `I can help you with your ${vehicleName} contract. What would you like to know?` }
                            ]);
                        }
                    }}
                >
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select a contract...">
                            {selectedContract
                                ? `${selectedContract.vehicle_year} ${selectedContract.vehicle_make} ${selectedContract.vehicle_model}`
                                : "Select a contract..."}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {contracts.map(contract => (
                            <SelectItem key={contract.id} value={contract.id.toString()}>
                                {contract.vehicle_year} {contract.vehicle_make} {contract.vehicle_model}
                            </SelectItem>
                        ))}
                        {contracts.length === 0 && (
                            <div className="px-2 py-2 text-xs text-muted-foreground text-center">No contracts found</div>
                        )}
                    </SelectContent>
                </Select>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { 
                        setMessages(initialMessages);
                        setSelectedContract(null);
                    }}
                    title="Clear Chat"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Chat Area */}
            <Card className="flex flex-1 flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "ai"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-secondary text-secondary-foreground"
                                    }`}>
                                    {m.role === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                </div>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "ai"
                                    ? "bg-secondary text-secondary-foreground"
                                    : "bg-primary text-primary-foreground"
                                    }`}>
                                    <p className="whitespace-pre-line">{m.text}</p>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-secondary text-secondary-foreground">
                                    <div className="flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="border-t p-3">
                    <form
                        onSubmit={handleSend}
                        className="flex gap-2"
                    >
                        <Input
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1"
                            disabled={isTyping}
                        />
                        <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
}
