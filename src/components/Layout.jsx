import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    BarChart2,
    Search,
    MessageSquare,
    Settings,
    LogOut,
    Menu,
    X,
    FolderOpen,
    Car,
    Sun,
    Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabaseClient';

export default function Layout() {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [theme, setTheme] = useState('light'); // Mock theme state

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'My Contracts', path: '/contracts', icon: FolderOpen },
        { name: 'Contract Analysis', path: '/analysis', icon: FileText },
        { name: 'VIN Lookup', path: '/vin', icon: Search },
        { name: 'AI Assistant', path: '/chat', icon: MessageSquare },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
        // Actual theme toggle logic implementation would go here (adding class to html/body)
    };

    return (
        <div className={`flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 ${theme === 'dark' ? 'dark' : ''}`}>
            {/* Sidebar */}
            <motion.aside
                initial={{ width: 280 }}
                animate={{ width: isSidebarOpen ? 280 : 96 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-30 relative"
            >
                {/* Header Logo */}
                <div className="h-24 flex items-center px-8 border-b border-slate-800">
                    <AnimatePresence mode='wait'>
                        {isSidebarOpen ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-900/20">
                                    <Car size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h1 className="font-extrabold text-xl tracking-tight text-white leading-none">Contract<span className="text-blue-500">Coach</span></h1>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">AI Negotiation</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full flex justify-center"
                            >
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-900/20">
                                    <Car size={24} strokeWidth={2.5} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="block relative group"
                            >
                                <div
                                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        } ${!isSidebarOpen && 'justify-center px-0'}`}
                                >
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors flex-shrink-0`} />

                                    {isSidebarOpen && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="font-bold text-sm tracking-wide"
                                        >
                                            {item.name}
                                        </motion.span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Toggle */}
                <div className="p-6 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 mb-2 ${!isSidebarOpen && 'justify-center px-0'}`}
                    >
                        {isSidebarOpen ? (
                            <>
                                <div className="p-1.5 bg-slate-800 rounded-lg"><Menu size={18} /></div>
                                <span className="text-sm font-bold">Collapse Menu</span>
                            </>
                        ) : (
                            <Menu size={24} />
                        )}
                    </button>

                    {isSidebarOpen && (
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-900/20 transition-colors font-bold text-sm"
                        >
                            <div className="p-1.5 bg-rose-900/20 rounded-lg"><LogOut size={18} /></div>
                            Sign Out
                        </button>
                    )}
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto bg-slate-50 relative selection:bg-blue-100 selection:text-blue-900">
                {/* Background Decor - Tech Grid & Gradients */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    opacity: 0.4
                }}></div>

                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
                <div className="absolute top-20 -left-20 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

                <div className="relative z-10 flex flex-col min-h-screen">
                    {/* Top Header */}
                    <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-20 bg-slate-50/80 backdrop-blur-sm">
                        <h2 className="text-xl font-bold text-slate-700 opacity-0 md:opacity-100 transition-opacity">
                            {/* Breadcrumb or Page Title could go here */}
                        </h2>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl bg-white text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 shadow-sm transition-all active:scale-95"
                                title="Toggle Theme"
                            >
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            </button>
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full border-2 border-white shadow-md"></div>
                        </div>
                    </header>

                    <div className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
