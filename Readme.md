# 🛡️ LeaseGaurd - 🚗 AI Car Lease Contract Review & Negotiation Assistant

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-yellow?style=for-the-badge&logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> Empower your car purchase decisions with AI-powered contract analysis, VIN verification, and intelligent negotiation assistance.

![Project Status](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [API Routes](#-api-routes)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Screenshots](#-screenshots)
- [Database Schema](#-database-schema)
- [Performance](#-performance)
- [Contributing](#-contributing)
- [License](#-license)
- [Team](#-team)

---

## 🎯 Overview

**AI Car Lease Contract Review & Negotiation Assistant** is an intelligent web application that leverages advanced AI and machine learning to help consumers understand, review, and negotiate car lease or loan contracts. Built with Next.js 15 and FastAPI, the platform provides comprehensive contract analysis, vehicle verification, and personalized negotiation strategies.

### What Makes This Special?

- **AI-Powered Contract Analysis**: Advanced LLM-based extraction of critical SLA (Service Level Agreement) terms from lease/loan documents
- **Contract Fairness Scoring**: Automated evaluation of contract terms against industry standards
- **VIN Verification**: Comprehensive vehicle history and information lookup using VIN numbers
- **Intelligent Negotiation Assistant**: AI chatbot trained on automotive negotiation best practices
- **Price Benchmarking**: Fair market value estimation using multiple data sources
- **Interactive Dashboard**: Real-time contract comparison and analysis visualization
- **Comprehensive Reports**: Detailed breakdown of all contract terms, red flags, and recommendations

---

## ✨ Key Features

### 🤖 AI-Powered Contract Analysis
- **Automatic SLA Extraction**: Upload PDF/image contracts for instant analysis
- **Key Terms Identification**: Interest rates, mileage limits, penalties, termination conditions
- **Red Flag Detection**: Highlight unfair or unusual contract clauses
- **Contract Fairness Score**: Algorithmic scoring of lease/loan agreements
- **Multi-Format Support**: PDF, PNG, JPG contract uploads

### 🔍 VIN-Based Vehicle Information
- **Comprehensive VIN Lookup**: Manufacturer details, specifications, recall history
- **Vehicle History Reports**: Past accidents, service records, odometer verification
- **Market Price Estimation**: Fair value ranges based on make, model, year, location
- **Registration Details**: State/county-level vehicle registration data
- **Safety Recalls**: NHTSA recall information integration

### 💰 Financial Analysis
- **Interest Rate Comparison**: APR benchmarking against market rates
- **Payment Calculator**: Monthly payment breakdowns and projections
- **Total Cost Analysis**: Lifetime cost calculations including fees
- **Lease vs. Buy Comparison**: Side-by-side financial modeling
- **Early Termination Costs**: Penalty calculations and alternatives

### 🗣️ Negotiation Assistant
- **AI Chatbot**: Real-time negotiation guidance and strategy
- **Email Templates**: Pre-written negotiation messages
- **Talking Points**: Curated questions to ask dealers
- **Market Data**: Leverage pricing insights for better deals
- **Contract Comparison**: Multi-offer analysis and recommendations

### 📊 Interactive Dashboard
- **Contract Overview**: Visual representation of all analyzed contracts
- **Status Tracking**: Active, analyzed, and draft contract management
- **Notifications Center**: Real-time updates and alerts
- **Project History**: Track all contract reviews and analyses
- **Export Reports**: Download comprehensive analysis PDFs

### 🔐 Secure & Private
- **User Authentication**: Secure login with JWT tokens
- **Data Encryption**: All contract data encrypted at rest
- **Privacy First**: No data sharing with third parties
- **Audit Logs**: Complete activity tracking
- **GDPR Compliant**: Right to deletion and data portability

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router with RSC)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [React 18](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [GSAP](https://greensock.com/gsap/) (GreenSock Animation Platform)
- **3D Graphics**: [Three.js](https://threejs.org/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Query (TanStack Query)

### Backend
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Database**: [NeonDB](https://neon.tech/) (Serverless Postgres)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Local + Cloud integration ready

### AI & Machine Learning
- **LLM Provider**: [Google Gemini 2.0 Flash](https://ai.google.dev/)
- **Framework**: [LangChain](https://www.langchain.com/)
- **Vector Database**: [ChromaDB](https://www.trychroma.com/)
- **OCR**: [PyTesseract](https://github.com/madmaze/pytesseract) (Tesseract OCR)
- **PDF Processing**: [PyPDF2](https://pypdf2.readthedocs.io/)
- **Data Validation**: [Pydantic](https://docs.pydantic.dev/)

### External APIs
- **VIN Lookup**: NHTSA Vehicle API, Data.gov
- **Price Estimation**: MARKETCHECK API, TrueCar (when available)
- **Geocoding**: Google Maps API (optional)
- **Market Data**: OpenDataSoft vehicle datasets

### Development Tools
- **Package Managers**: npm (frontend), pip (backend)
- **Version Control**: Git + GitHub
- **Database Management**: Prisma Studio
- **API Testing**: FastAPI Swagger UI
- **Code Quality**: ESLint, Black (Python formatter)

---

## 🏗 Architecture

### Application Flow
```
User Authentication (JWT)
         ↓
   Dashboard Interface
         ↓
Upload Contract (PDF/Image)
         ↓
OCR + Text Extraction (PyTesseract/PyPDF2)
         ↓
AI Analysis (Google Gemini via LangChain)
    ↓              ↓              ↓
SLA Extract   Red Flags   Fairness Score
         ↓
VIN Lookup (NHTSA API)
         ↓
Price Benchmarking (Market Data APIs)
         ↓
Store Analysis (Prisma + NeonDB)
         ↓
Interactive Dashboard (Next.js)
         ↓
AI Negotiation Assistant (Chatbot)
         ↓
Generate Reports & Recommendations
```

### Tech Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │ Contract │  │   Chat   │  │ Reports │ │
│  │   Page   │  │ Analyzer │  │Assistant │  │  Page   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                           ↓                              │
│                    API Routes (Next.js)                  │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Contract │  │   VIN    │  │  Price   │  │   AI    │ │
│  │ Analysis │  │  Lookup  │  │  Check   │  │Chatbot  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                           ↓                              │
│     ┌────────────────────────────────────┐              │
│     │  LangChain + Google Gemini 2.0     │              │
│     └────────────────────────────────────┘              │
└─────────────────────────┬───────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│             Database Layer (Prisma + NeonDB)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Users   │  │Contracts │  │Vehicles  │  │  Audit  │ │
│  │  Table   │  │  Table   │  │  Table   │  │  Logs   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Database Schema (Prisma + PostgreSQL)

**Main Collections:**
- `users`: User profiles and authentication data
- `contracts`: Uploaded contract documents and metadata
- `sla`: Extracted Service Level Agreement terms
- `vehicles`: Vehicle information from VIN lookup
- `extractions`: Raw AI extraction results
- `extracted_clauses`: Individual contract clauses with red flag levels
- `negotiation_threads`: Chat conversation history
- `negotiation_messages`: Individual chat messages
- `provider_recommendations`: Suggested solar/financing providers
- `contract_pages`: Multi-page contract storage
- `price_recommendations`: Market price suggestions
- `offer_comparisons`: Side-by-side offer analysis
- `audit_events`: User activity tracking

---

## 🔌 API Routes

### Contract Analysis (FastAPI Backend)

#### Upload & Extract
- **POST** `/api/contracts/upload` - Upload contract document
  - Accepts: PDF, PNG, JPG
  - Returns: Contract ID and extraction status

- **POST** `/api/contracts/extract-sla/:id` - Extract SLA terms
  - Uses: Google Gemini + LangChain
  - Returns: Structured SLA data

#### Analysis
- **POST** `/api/analyze-contract` - Full contract analysis
  - OCR + AI extraction
  - Red flag detection
  - Fairness scoring

- **GET** `/api/contracts/:id` - Retrieve contract details
- **GET** `/api/contracts/:id/sla` - Get extracted SLA terms
- **DELETE** `/api/contracts/:id` - Delete contract

### Vehicle Information

- **POST** `/api/vin/lookup` - VIN-based vehicle lookup
  - NHTSA API integration
  - Vehicle specifications
  - Recall history

- **POST** `/api/market/price` - Market price estimation
  - Fair market value calculation
  - Price range recommendations

### Negotiation Assistant

- **POST** `/api/negotiation/analyze/:contractId` - Generate negotiation insights
  - Contract weakness analysis
  - Leverage points identification

- **POST** `/api/negotiation/script/:contractId` - Create negotiation script
  - Email templates
  - Talking points

- **POST** `/api/negotiation/ask/:contractId` - AI chatbot endpoint
  - Real-time Q&A
  - Personalized advice

### User Management (Next.js API Routes)

- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/login` - User login (JWT)
- **GET** `/api/auth/me` - Get current user
- **PUT** `/api/auth/profile` - Update profile
- **POST** `/api/auth/change-password` - Change password
- **DELETE** `/api/auth/account` - Delete account

### Dashboard

- **GET** `/api/dashboard/analytics` - Get dashboard statistics
  - Total contracts analyzed
  - Average fairness score
  - High-risk clauses count
  - Savings identified

---

## 🚀 Getting Started

### Prerequisites

**Frontend:**
- Node.js 18.x or higher
- npm or yarn
- Git

**Backend:**
- Python 3.11 or higher
- pip
- Tesseract OCR

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Kritika11052005/AI_LLM-Based-Car-lease-contract-review-and-Negotiation-Assistant.git
cd car-lease-ai-assistant
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Database
DATABASE_URL="postgresql://user:pass@your-neon-db.neon.tech/dbname?sslmode=require"


# Authentication
JWT_SECRET="your-super-secret-jwt-key"

#Frontend
NEXT_PUBLIC_ENABLE_3D_HERO=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Backend API
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

```bash
# Initialize Prisma
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

#### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create `.env` file in backend folder:
```env
# Google Gemini API
GEMINI_API_KEY="your-gemini-api-key"

# Database
DATABASE_URL="postgresql://user:pass@your-neon-db.neon.tech/dbname?sslmode=require"



# NHTSA API (optional - no key needed, public API)
NHTSA_DECODE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json"
NHTSA_RECALL_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle?make={make}&model={model}&modelYear={year}"

# Optional: MARKETCHECK API
MARKETCHECK_API_KEY="your-api-key"
MARKETCHECK_SECRET_API_KEY="your-secret-api-key"
```

```bash
# Install Tesseract OCR
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
# macOS:
brew install tesseract
# Ubuntu/Debian:
sudo apt-get install tesseract-ocr

# Run FastAPI server
uvicorn main:app --reload --port 8000
```

#### 4. Open Your Browser

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

**Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 📁 Project Structure

```
car-lease-ai-assistant/
├── frontend/                      # Next.js Frontend
│   ├── app/                       # Next.js 15 App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── contracts/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── negotiate/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── upload/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                   # Next.js API Routes
│   │   │   ├── auth/
│   │   │   │   ├── profile/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── change-password/
│   │   │   │   │   └── route.ts
│   │   │   │   └── account/
│   │   │   │       └── route.ts
│   │   │   └── dashboard/
│   │   │       └── analytics/
│   │   │           └── route.ts
│   │   │
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Landing page
│   │
│   ├── components/                # React Components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignUpForm.tsx
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── EmailGenerator.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── contract/
│   │   │   ├── ContractTable.tsx
│   │   │   ├── ContractUploader.tsx
│   │   │   ├── FairnessScoreCard.tsx
│   │   │   ├── PriceEstimation.tsx
│   │   │   ├── RiskIndicator.tsx
│   │   │   ├── SLADisplay.tsx
│   │   │   └── VehicleInfo.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardClient.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── FairnessChart.tsx
│   │   │   └── RiskDistributionChart.tsx
│   │   ├── landing/
│   │   │   ├── Features.tsx
│   │   │   ├── FinalCTA.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Hero3D.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   └── Problem.tsx
│   │   ├── providers/
│   │   │   └── theme-provider.tsx
│   │   ├── shared/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── Header.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── Galaxy.tsx
│   │   │   ├── Particles.tsx
│   │   │   ├── StaggeredMenu.tsx
│   │   │   └── TargetCursor.tsx
│   │   └── upload/
│   │       └── UploadContractPage.tsx
│   │
│   ├── config/
│   │   └── dashboard.ts           # Dashboard configuration
│   │
│   ├── hooks/
│   │   ├── useAnalytics.ts
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useContracts.ts
│   │   └── useNegotiation.ts
│   │
│   ├── lib/
│   │   ├── api.ts                 # API client
│   │   ├── auth.ts                # Auth helpers
│   │   ├── constants.ts           # App constants
│   │   ├── prisma.ts              # Prisma client
│   │   └── utils.ts               # Utility functions
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma          # Database schema
│   │
│   ├── public/
│   │   ├── images/
│   │   │   └── models/
│   │   │       ├── car.glb
│   │   │       └── r8.fbx
│   │   └── videos/
│   │       └── auth-bg.mp4
│   │
│   ├── store/
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── chat.ts
│   │   ├── contract.ts
│   │   ├── dashboard.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   ├── .env.local
│   ├── .eslintrc.json
│   ├── .gitignore
│   ├── components.json
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                       # FastAPI Backend
│   ├── app/
│   │   ├── __pycache__/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── fairness.py
│   │   │   ├── llm_service.py
│   │   │   ├── market_service.py
│   │   │   ├── negotiation_chatbot.py
│   │   │   ├── negotiation_rag_enhanced.py
│   │   │   ├── negotiation_rules.py
│   │   │   ├── ocr_service.py
│   │   │   ├── rate_limiter.py
│   │   │   ├── vin_extractor.py
│   │   │   └── vin_service.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── sla_models.py
│   │   │   └── vin_models.py
│   │   │
│   │   └── routes/
│   │       ├── fairness.py
│   │       ├── market.py
│   │       ├── negotiation_routes.py
│   │       ├── upload.py
│   │       └── vin.py
│   │
│   ├── chroma_db/                 # ChromaDB vector storage
│   ├── uploads/                   # Uploaded contracts
│   ├── venv/                      # Python virtual environment
│   │
│   ├── .env
│   ├── .gitignore
│   ├── database.py
│   ├── main.py                    # FastAPI entry point
│   ├── requirements.txt
│   └── runtime.txt
│
├── .gitignore
└── README.md
```

---

## 🔐 Environment Variables

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | NeonDB connection string | `postgresql://user:pass@neon.tech/db` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key-here` |
| `NEXT_PUBLIC_BACKEND_URL` | FastAPI backend URL | `http://localhost:8000` |
| `NEXT_PUBLIC_APP_URL` | App base URL | `http://localhost:3000` |
| `NEXT_PUBLIC_ENABLE_3D_HERO` | boolean | `true` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | boolean | `true` |

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ Yes |
| `DATABASE_URL` | PostgreSQL connection | ✅ Yes |
| `JWT_SECRET` | JWT secret key | ✅ Yes |
| `JWT_ALGORITHM` | JWT algorithm | ✅ Yes |
| `MARKETCHECK_API_KEY` | MARKETCHECK API key | ✅ Yes |
| `MARKETCHECK_API_SECRET_KEY` | MARKETCHECK API Secret key | ✅ Yes |

### Getting API Keys

1. **Google Gemini API**: [Google AI Studio](https://ai.google.dev/)
2. **NeonDB**: [neon.tech](https://neon.tech/) (Free tier available)
3. **MARKETCHECK API**: [www.marketcheck.com/apis](https://www.marketcheck.com/apis/cars/) (Optional)

---

## 📸 Screenshots

### Landing Page
![alt text](image.png)
*AI-Powered Contract Review - Hero Section with 3D car visualization*

### Features Overview
![alt text](image-1.png)
*Intelligent contract analysis, VIN verification, negotiation assistant, and price benchmarking*

### Dashboard
![alt text](image-2.png)
![alt text](image-3.png)
*Real-time analytics showing total contracts, fairness scores, and savings identified*

### Contract Upload
![alt text](image-4.png)
*Drag-and-drop interface for PDF/image contract uploads with real-time processing*

### SLA Extraction Results
![alt text](image-5.png)
![alt text](image-6.png)
![alt text](image-7.png)
![alt text](image-8.png)
*Detailed breakdown of all extracted contract terms with color-coded risk indicators*

### Fairness Score Analysis
*Visual representation of contract fairness with detailed breakdown of positive and negative factors*

### VIN Lookup Results
![alt text](image-9.png)
*Comprehensive vehicle information including specifications, recalls, and market value*

### Negotiation Chat Assistant
![alt text](image-10.png)
*Interactive AI chatbot providing real-time negotiation guidance and strategy*

### Contract Comparison
![alt text](image-11.png)
*Side-by-side analysis of multiple contract offers with recommendations*

### Email Generator
![alt text](image-12.png)
![alt text](image-13.png)
*AI-generated negotiation emails based on contract analysis and market data*

---

## 💾 Database Schema

### Core Tables

**users**
```sql
- id (UUID, PK)
- email (STRING, UNIQUE)
- password_hash (STRING)
- full_name (STRING)
- phone (STRING)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**contracts**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- dealer_offer_name (STRING)
- original_filename (STRING)
- file_path (STRING)
- file_type (STRING)
- fairness_score (DECIMAL)
- red_flag_level (ENUM: high/medium/low)
- status (ENUM: pending/analyzed/completed)
- created_at (TIMESTAMP)
```

**sla (Service Level Agreements)**
```sql
- id (UUID, PK)
- contract_id (UUID, FK)
- apr_percent (DECIMAL)
- lease_term_months (INTEGER)
- down_payment (DECIMAL)
- monthly_payment (DECIMAL)
- residual_value (DECIMAL)
- mileage_limit (INTEGER)
- overage_charge (DECIMAL)
- early_termination_fee (DECIMAL)
- disposition_fee (DECIMAL)
- purchase_option_price (DECIMAL)
```

**vehicles**
```sql
- id (UUID, PK)
- contract_id (UUID, FK)
- vin (STRING, UNIQUE)
- year (INTEGER)
- make (STRING)
- model (STRING)
- trim (STRING)
- body_style (STRING)
- engine (STRING)
- transmission (STRING)
- fuel_type (STRING)
```

**extracted_clauses**
```sql
- id (UUID, PK)
- extraction_id (UUID, FK)
- clause_type (STRING)
- text_snippet (TEXT)
- comment (TEXT)
- red_flag_level (ENUM)
- impact (STRING)
```

**negotiation_threads**
```sql
- id (UUID, PK)
- contract_id (UUID, FK)
- title (STRING)
- status (ENUM: active/closed)
- created_at (TIMESTAMP)
```

**negotiation_messages**
```sql
- id (UUID, PK)
- thread_id (UUID, FK)
- role (ENUM: user/assistant)
- content (TEXT)
- created_at (TIMESTAMP)
```

For complete schema, see [prisma/schema.prisma](frontend/prisma/schema.prisma)

---

## ⚡ Performance

### Optimizations Implemented

**Frontend:**
- Next.js 15 Server Components for reduced bundle size
- Dynamic imports for code splitting
- Image optimization with next/image
- Font optimization and preloading
- GSAP for hardware-accelerated animations
- React Query for efficient data fetching and caching

**Backend:**
- FastAPI async/await for non-blocking I/O
- Connection pooling for database
- LangChain streaming for faster LLM responses
- ChromaDB vector caching for repeated queries
- Rate limiting to prevent abuse
- Batch processing for multiple contracts

**Database:**
- Indexed columns for faster queries
- Prisma query optimization
- Connection pooling
- NeonDB serverless scaling

### Performance Metrics

- **Contract Upload**: < 2s
- **SLA Extraction**: 5-10s (AI processing)
- **VIN Lookup**: < 1s
- **Dashboard Load**: < 1.5s
- **Chat Response**: 2-5s (streaming)
- **API Response Time**: < 500ms (average)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

**Frontend:**
```bash
# Run development server
npm run dev

# Run linter
npm run lint

# Type checking
npm run type-check

# Build for production
npm run build
```

**Backend:**
```bash


.\venv\Scripts\Activate

# Run FastAPI server
uvicorn main:app --reload

# Run tests
pytest

# Format code
black .

# Type checking
mypy .
```

### Coding Standards

- Follow TypeScript best practices for frontend
- Use PEP 8 for Python code
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features
- Write tests for new functionality

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 [Kritika Benjwal]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Team

<div align="center">

### Built with ❤️ by [Kritika Benjwal]

</div>

---

## 🙏 Acknowledgments

- **Next.js Team** for the incredible framework
- **FastAPI** for the high-performance backend framework
- **Google Gemini** for powerful AI capabilities
- **LangChain** for LLM orchestration
- **NeonDB** for serverless PostgreSQL
- **Prisma** for excellent ORM
- **shadcn/ui** for beautiful UI components
- **GSAP** for smooth animations
- **Three.js** for 3D graphics
- **NHTSA** for vehicle data API
- **The open-source community** for amazing tools

---

## 🔮 Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Voice-based contract review
- [ ] Blockchain verification for contracts
- [ ] Integration with dealership systems
- [ ] Advanced market analytics
- [ ] Insurance comparison
- [ ] Financing calculator
- [ ] Lease buyout analyzer
- [ ] Trade-in value estimator
- [ ] Credit score integration
- [ ] Payment gateway for premium features
- [ ] White-label solution for dealerships
- [ ] API for third-party integrations

---

<div align="center">

### Built with Next.js 15 & FastAPI 🚀

![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js%2015-black?style=for-the-badge&logo=next.js)
![Powered by FastAPI](https://img.shields.io/badge/Powered%20by-FastAPI-green?style=for-the-badge&logo=fastapi)
![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-blue?style=for-the-badge&logo=google)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

⭐ **Star this repo if you find it helpful!**

[🔗 Live Demo-Frontend](https://ai-llm-based-car-lease-contract-rev.vercel.app/) |[🔗 Live Demo-Backend](https://ai-llm-based-car-lease-contract-review-kwjr.onrender.com/) | [📧 Contact](mailto:ananya.benjwal@gmail.com) | [💼 Contribute](#contributing)

---

© 2025 AI Car Lease Contract Review Assistant. All rights reserved.

*Empowering consumers with AI-driven transparency in automotive financing. Make informed decisions with confidence.*

</div>