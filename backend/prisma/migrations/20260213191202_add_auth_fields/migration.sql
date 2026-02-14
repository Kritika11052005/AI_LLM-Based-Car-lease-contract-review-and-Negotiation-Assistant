-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" VARCHAR(255),
    "name" VARCHAR(200),
    "phone" VARCHAR(40),
    "full_name" VARCHAR(200),
    "auth_provider" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(50),
    "state" VARCHAR(60),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(60),
    "phone" VARCHAR(40),
    "website" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lenders" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255),
    "nmls_id" VARCHAR(50),
    "website" VARCHAR(255),
    "phone" VARCHAR(40),
    "address" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "vin" VARCHAR(17),
    "year" INTEGER,
    "make" VARCHAR(100),
    "model" VARCHAR(100),
    "trim" VARCHAR(100),
    "body_class" VARCHAR(100),
    "engine" VARCHAR(100),
    "drivetrain" VARCHAR(100),
    "fuel_type" VARCHAR(50),
    "odometer_miles" DECIMAL(10,1),
    "color_ext" VARCHAR(60),
    "color_int" VARCHAR(60),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_recalls" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "recall_number" VARCHAR(100),
    "issue_date" TIMESTAMP(3),
    "component" VARCHAR(255),
    "summary" TEXT,
    "remedy" TEXT,
    "source" VARCHAR(100),
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_recalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_reports" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "title" VARCHAR(255),
    "report_type" VARCHAR(80),
    "availability" VARCHAR(40),
    "url" VARCHAR(512),
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "lender_id" TEXT,
    "name" VARCHAR(120),
    "kind" VARCHAR(40),
    "is_free" BOOLEAN DEFAULT false,
    "base_url" VARCHAR(255),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_credentials" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "label" VARCHAR(100),
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "vehicle_id" TEXT,
    "dealer_id" TEXT,
    "lender_id" TEXT,
    "contract_type" VARCHAR(40),
    "doc_status" VARCHAR(40),
    "dealer_offer_name" VARCHAR(200),
    "contract_date" DATE,
    "locale" VARCHAR(10),
    "currency" VARCHAR(3),
    "fairness_score" DECIMAL(5,2),
    "red_flag_level" TEXT,
    "notes" TEXT,
    "negotiation_intents" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_files" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "storage_url" VARCHAR(512),
    "file_name" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "page_count" INTEGER,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_pages" (
    "id" TEXT NOT NULL,
    "contract_file_id" TEXT NOT NULL,
    "page_number" INTEGER,
    "ocr_text" TEXT,
    "ocr_confidence" DECIMAL(5,2),
    "thumbnail_url" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_clauses" (
    "id" TEXT NOT NULL,
    "extraction_id" TEXT,
    "page_id" TEXT,
    "clause_type" VARCHAR(100),
    "page_number" INTEGER,
    "text_snippet" TEXT,
    "normalized_value" TEXT,
    "red_flag_level" TEXT,
    "comment" TEXT,

    CONSTRAINT "extracted_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_sla" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "apr_percent" DECIMAL(6,3),
    "money_factor" DECIMAL(10,6),
    "term_months" INTEGER,
    "monthly_payment" DECIMAL(12,2),
    "down_payment" DECIMAL(12,2),
    "fees_total" DECIMAL(12,2),
    "residual_value" DECIMAL(12,2),
    "residual_percent_msrp" DECIMAL(6,3),
    "msrp" DECIMAL(12,2),
    "cap_cost" DECIMAL(12,2),
    "cap_cost_reduction" DECIMAL(12,2),
    "mileage_allowance_yr" INTEGER,
    "mileage_overage_fee" DECIMAL(8,4),
    "early_termination_fee" DECIMAL(12,2),
    "disposition_fee" DECIMAL(12,2),
    "purchase_option_price" DECIMAL(12,2),
    "insurance_requirements" TEXT,
    "maintenance_resp" TEXT,
    "warranty_summary" TEXT,
    "late_fee_policy" TEXT,
    "other_terms" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "contract_sla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extractions" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT,
    "model_name" VARCHAR(70),
    "prompt_version" VARCHAR(60),
    "extraction_status" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "raw_output" JSONB,
    "error_message" TEXT,

    CONSTRAINT "extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_sources" (
    "id" TEXT NOT NULL,
    "price_reco_id" TEXT,
    "provider_id" TEXT,
    "sample_size" INTEGER,
    "median_price" DECIMAL(12,2),
    "min_price" DECIMAL(12,2),
    "max_price" DECIMAL(12,2),
    "url" VARCHAR(512),
    "raw" JSONB,

    CONSTRAINT "price_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_recommendations" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "geo_postal" VARCHAR(20),
    "msrp" DECIMAL(12,2),
    "fair_price_low" DECIMAL(12,2),
    "fair_price_high" DECIMAL(12,2),
    "basis" VARCHAR(160),
    "methodology" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_comparisons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "primary_contract" TEXT,
    "compared_contract" TEXT,
    "comparison_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_threads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "contract_id" TEXT,
    "dealer_id" TEXT,
    "lender_id" TEXT,
    "negotiation_channel" TEXT,
    "subject" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "negotiation_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_role" VARCHAR(40) NOT NULL,
    "body" TEXT NOT NULL,
    "suggested_text" TEXT,
    "attachments" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negotiation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT,
    "request_path" VARCHAR(512),
    "request_params" JSONB,
    "response_status" INTEGER,
    "response_ms" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error_message" TEXT,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_table" VARCHAR(80),
    "entity_id" TEXT,
    "action" VARCHAR(40),
    "details" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tagging" (
    "id" TEXT NOT NULL,
    "tag" VARCHAR(80),
    "entity_table" VARCHAR(80),
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tagging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContractToPriceRecommendation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "contract_sla_contract_id_key" ON "contract_sla"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "_ContractToPriceRecommendation_AB_unique" ON "_ContractToPriceRecommendation"("A", "B");

-- CreateIndex
CREATE INDEX "_ContractToPriceRecommendation_B_index" ON "_ContractToPriceRecommendation"("B");

-- AddForeignKey
ALTER TABLE "vehicle_recalls" ADD CONSTRAINT "vehicle_recalls_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_reports" ADD CONSTRAINT "vehicle_reports_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_reports" ADD CONSTRAINT "vehicle_reports_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_files" ADD CONSTRAINT "contract_files_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_pages" ADD CONSTRAINT "contract_pages_contract_file_id_fkey" FOREIGN KEY ("contract_file_id") REFERENCES "contract_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_clauses" ADD CONSTRAINT "extracted_clauses_extraction_id_fkey" FOREIGN KEY ("extraction_id") REFERENCES "extractions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_clauses" ADD CONSTRAINT "extracted_clauses_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "contract_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_sla" ADD CONSTRAINT "contract_sla_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_sources" ADD CONSTRAINT "price_sources_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_recommendations" ADD CONSTRAINT "price_recommendations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_comparisons" ADD CONSTRAINT "offer_comparisons_primary_contract_fkey" FOREIGN KEY ("primary_contract") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_threads" ADD CONSTRAINT "negotiation_threads_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_messages" ADD CONSTRAINT "negotiation_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "negotiation_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractToPriceRecommendation" ADD CONSTRAINT "_ContractToPriceRecommendation_A_fkey" FOREIGN KEY ("A") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractToPriceRecommendation" ADD CONSTRAINT "_ContractToPriceRecommendation_B_fkey" FOREIGN KEY ("B") REFERENCES "price_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
