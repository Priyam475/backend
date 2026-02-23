-- ============================================================
-- MERKOTRACE MANDI APPLICATION ECOSYSTEM
-- Complete Database Schema — DDL (Data Definition Language)
-- PostgreSQL Native — All 14 Parts
-- Generated: 2026-02-23
-- ============================================================

-- ============================================================
-- PART 1 — ENUM TYPES
-- PostgreSQL ENUM type definitions — must be created before any table that references them.
-- ============================================================

-- 1.1 approval_status_enum
-- Trader approval lifecycle states.
CREATE TYPE approval_status_enum AS ENUM ('PENDING','APPROVED');

-- 1.2 charge_type_enum
-- Defines whether a dynamic charge is percentage-based or a fixed amount.
CREATE TYPE charge_type_enum AS ENUM ('PERCENT','FIXED');

-- 1.3 applies_to_enum
-- Determines the party to whom a charge is applied.
CREATE TYPE applies_to_enum AS ENUM ('BUYER','SELLER');

-- 1.4 freight_method_enum
-- Freight calculation methodology options.
CREATE TYPE freight_method_enum AS ENUM 
('BY_WEIGHT','BY_COUNT','LUMPSUM','DIVIDE_BY_WEIGHT');

-- 1.5 voucher_status_enum
-- Voucher lifecycle states — from draft through posting, partial settlement, closure, and reversal (REQ-FIN-011).
CREATE TYPE voucher_status_enum AS ENUM 
('DRAFT','POSTED','PARTIALLY_SETTLED','CLOSED','REVERSED');

-- 1.6 payment_mode_enum
-- Supported payment modes for journal entries.
CREATE TYPE payment_mode_enum AS ENUM ('CASH','UPI','BANK');

-- 1.7 account_type_enum
-- Accounting ledger categories.
CREATE TYPE account_type_enum AS ENUM ('ASSET','LIABILITY','INCOME','EXPENSE');

-- 1.8 deduction_type_enum
-- Classification of deduction rules.
CREATE TYPE deduction_type_enum AS ENUM ('GOVT','ROUND_OFF','CUSTOM');

-- 1.9 lot_status_enum
-- Lot lifecycle states — from open (available for auction) to closed (settled/self-sold) or in-transit (dispatched via CDN).
CREATE TYPE lot_status_enum AS ENUM ('OPEN','CLOSED','IN_TRANSIT','SELF_SOLD');

-- 1.10 business_mode_enum
-- Trader business model — determines revenue recognition and GL impact for self-sale closures (REQ-SS-004, REQ-SS-005).
CREATE TYPE business_mode_enum AS ENUM ('COMMISSION','TRADING');

-- 1.11 cdn_status_enum
-- CDN document lifecycle — from draft to dispatched, received, or transferred via Mercotrace PIN (REQ-CDN-001 to REQ-CDN-011).
CREATE TYPE cdn_status_enum AS ENUM ('DRAFT','DISPATCHED','RECEIVED','TRANSFERRED');

-- 1.12 cdn_source_enum
-- Source method used to populate a CDN — Sales Pad, Self Sale, Stock Purchase, or Direct Input (REQ-CDN-002 to REQ-CDN-005).
CREATE TYPE cdn_source_enum AS ENUM ('SALES_PAD','SELF_SALE','STOCK_PURCHASE','DIRECT');

-- 1.13 print_format_enum
-- Supported print output formats across the system (REQ-PRN-001).
CREATE TYPE print_format_enum AS ENUM 
('A4_PORTRAIT','A4_LANDSCAPE','A5_PORTRAIT','THERMAL_80MM','STICKER_150x80');

-- 1.14 print_stage_enum
-- Stage at which a print is generated in the operational workflow (REQ-PRN-003 to REQ-PRN-017).
CREATE TYPE print_stage_enum AS ENUM 
('PRE_AUCTION','POST_AUCTION','POST_WEIGHING','BILLING','SELLER_INVOICE','MARKET_FEE');

-- 1.15 risk_level_enum
-- Party exposure risk classification — 7d Medium, 15d High, 30d Critical (REQ-RPT-008).
CREATE TYPE risk_level_enum AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

-- 1.16 voucher_type_enum
-- Voucher classification for Self-Sale, Stock Purchase, and CDN interactions (Part 7 — Voucher Engine).
CREATE TYPE voucher_type_enum AS ENUM 
('PURCHASE','SALES','COMMISSION','PAYMENT','OPERATIONAL');


-- ============================================================
-- PART 2 — CORE CONTROL TABLES
-- User management, role-based access control, and trader entity tables. All tables follow snake_case naming, include audit columns (created_at, created_by, updated_at, updated_by, is_deleted), use TIMESTAMPTZ, and have FK indexes.
-- ============================================================

-- 2.1 traders
-- Primary business entity — each trader represents a Mandi shop or commission agent.
CREATE TABLE traders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    address TEXT,
    category VARCHAR(100),
    approval_status approval_status_enum DEFAULT 'PENDING',
    business_mode business_mode_enum DEFAULT 'COMMISSION',
    bill_prefix VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 2.2 roles
-- System roles such as Super Admin, Trader, Writer, Cashier.
CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 2.3 permissions
-- Granular permission definitions for feature-level access control.
CREATE TABLE permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    permission_name VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 2.4 role_permissions
-- Many-to-many mapping between roles and permissions.
CREATE TABLE role_permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) 
        REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT uk_role_permission UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 2.5 users
-- Application users tied to a trader entity with hashed credentials.
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_users_trader FOREIGN KEY (trader_id) 
        REFERENCES traders(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_trader_id ON users(trader_id);
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_users_mobile ON users(mobile) WHERE mobile IS NOT NULL;

-- 2.6 user_roles
-- Many-to-many assignment of roles to users.
CREATE TABLE user_roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_role UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- 2.7 business_categories
-- Master list of business categories managed by Super Admin. Traders select from this list during registration (REQ-ONB-003).
CREATE TABLE business_categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE
);


-- ============================================================
-- PART 3 — MASTER TABLES
-- Business configuration tables — commodities, pricing rules, deduction slabs, labor charges, and dynamic charge definitions. Backend stores pre-configured values only; all computation logic resides in the frontend.
-- ============================================================

-- 3.1 commodities
-- Per-trader commodity catalogue with unique naming constraint.
CREATE TABLE commodities (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    commodity_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_commodities_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT uk_trader_commodity UNIQUE(trader_id, commodity_name)
);

CREATE INDEX idx_commodities_trader_id ON commodities(trader_id);

-- 3.2 commodity_configurations
-- Rate, weight limits, deduction toggles, commission, HSN code per commodity. Stores configuration values; frontend uses these for calculations.
CREATE TABLE commodity_configurations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    commodity_id BIGINT NOT NULL,
    rate_per_unit NUMERIC(15,2) NOT NULL,
    min_weight NUMERIC(15,2),
    max_weight NUMERIC(15,2),
    govt_deduction_enabled BOOLEAN DEFAULT FALSE,
    roundoff_enabled BOOLEAN DEFAULT FALSE,
    commission_percent NUMERIC(6,2),
    user_fee_percent NUMERIC(6,2),
    hsn_code VARCHAR(20),
    rate_basis_label VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_cc_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id) ON DELETE CASCADE
);

CREATE INDEX idx_commodity_configurations_commodity_id ON commodity_configurations(commodity_id);

-- 3.3 deduction_rules
-- Weight-based deduction slab configuration per commodity. Frontend reads rules and applies deductions.
CREATE TABLE deduction_rules (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    commodity_id BIGINT NOT NULL,
    min_weight NUMERIC(15,2),
    max_weight NUMERIC(15,2),
    deduction_value NUMERIC(15,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_dr_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id) ON DELETE CASCADE
);

CREATE INDEX idx_deduction_rules_commodity_id ON deduction_rules(commodity_id);

-- 3.4 hamali_slabs
-- Labor charge slab configuration per commodity. Frontend reads slab data and computes hamali charges.
CREATE TABLE hamali_slabs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    commodity_id BIGINT NOT NULL,
    threshold_weight NUMERIC(15,2),
    fixed_rate NUMERIC(15,2),
    per_kg_rate NUMERIC(15,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_hs_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id) ON DELETE CASCADE
);

CREATE INDEX idx_hamali_slabs_commodity_id ON hamali_slabs(commodity_id);

-- 3.5 dynamic_charges
-- Trader-defined custom charges (percentage or fixed). Backend stores definition; frontend applies to transactions.
CREATE TABLE dynamic_charges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    charge_name VARCHAR(150) NOT NULL,
    charge_type charge_type_enum NOT NULL,
    rate_value NUMERIC(15,2) NOT NULL,
    applies_to applies_to_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_dc_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE
);

CREATE INDEX idx_dynamic_charges_trader_id ON dynamic_charges(trader_id);


-- ============================================================
-- PART 4 — CONTACT & LEDGER TABLES
-- Contact registry, chart of accounts, double-entry journal, and advance tracking. Backend stores all financial values as pre-computed by the frontend.
-- ============================================================

-- 4.1 contacts
-- Per-trader contact directory with unique phone constraint.
CREATE TABLE contacts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    mark VARCHAR(20),
    address TEXT,
    is_temporary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_contacts_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT uk_trader_phone UNIQUE(trader_id, phone)
);

CREATE INDEX idx_contacts_trader_id ON contacts(trader_id);
CREATE INDEX idx_contacts_mark ON contacts(mark);

-- 4.2 ledgers
-- Accounting ledger definitions tied to traders and optionally to contacts. Auto-created on contact registration.
CREATE TABLE ledgers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    contact_id BIGINT,
    ledger_name VARCHAR(150) NOT NULL,
    account_type account_type_enum NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    is_control_account BOOLEAN DEFAULT FALSE,
    parent_ledger_id BIGINT,
    subledger_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ledgers_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ledgers_contact FOREIGN KEY (contact_id)
        REFERENCES contacts(id) ON DELETE SET NULL,
    CONSTRAINT fk_ledgers_parent FOREIGN KEY (parent_ledger_id)
        REFERENCES ledgers(id)
);

CREATE INDEX idx_ledgers_trader_id ON ledgers(trader_id);
CREATE INDEX idx_ledgers_contact_id ON ledgers(contact_id);
CREATE INDEX idx_ledgers_parent_ledger_id ON ledgers(parent_ledger_id);

-- is_system: TRUE for immutable system-generated ledgers (Cash, AR Control, AP Control, GST, etc.)
-- is_control_account: TRUE for AR/AP control accounts — direct posting blocked
-- parent_ledger_id: Links subledger to parent control account
-- subledger_type: RECEIVABLE | PAYABLE

-- 4.3 ledger_entries
-- Journal entry header with reference tracking and user attribution. Stores pre-computed amounts from frontend.
CREATE TABLE ledger_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_le_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE
);

CREATE INDEX idx_ledger_entries_trader_id ON ledger_entries(trader_id);

-- 4.4 ledger_lines
-- Double-entry line items — debit/credit mutually exclusive. All amounts are pre-computed by the frontend.
CREATE TABLE ledger_lines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entry_id BIGINT NOT NULL,
    ledger_id BIGINT NOT NULL,
    debit NUMERIC(15,2) DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(15,2) DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ll_entry FOREIGN KEY (entry_id)
        REFERENCES ledger_entries(id) ON DELETE CASCADE,
    CONSTRAINT fk_ll_ledger FOREIGN KEY (ledger_id)
        REFERENCES ledgers(id),
    CONSTRAINT chk_debit_credit CHECK (
        (debit > 0 AND credit = 0) OR 
        (credit > 0 AND debit = 0)
    )
);

CREATE INDEX idx_ledger_lines_entry_id ON ledger_lines(entry_id);
CREATE INDEX idx_ledger_lines_ledger_id ON ledger_lines(ledger_id);

-- Balancing (Total Debit = Total Credit per entry)
-- enforced via application-level validation before persisting

-- 4.5 advances
-- Pre-payments recorded against contacts. Amount is pre-computed by frontend.
CREATE TABLE advances (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    contact_id BIGINT NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    reference_type VARCHAR(50),
    reference_id BIGINT,
    is_reconciled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_advances_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_advances_contact FOREIGN KEY (contact_id)
        REFERENCES contacts(id)
);

CREATE INDEX idx_advances_trader_id ON advances(trader_id);
CREATE INDEX idx_advances_contact_id ON advances(contact_id);


-- ============================================================
-- PART 5 — ARRIVALS & LOGISTICS TABLES
-- Vehicle arrival tracking, weighing, seller-lot allocation, freight storage and distribution. All computed values (net weight, freight totals) are received pre-calculated from the frontend.
-- ============================================================

-- 5.1 vehicles
-- Vehicle arrival registration per trader.
CREATE TABLE vehicles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    arrival_datetime TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_vehicles_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicles_trader_id ON vehicles(trader_id);

-- 5.2 vehicle_weights
-- Stores loaded, empty, deducted, and net weight values as submitted by the frontend.
CREATE TABLE vehicle_weights (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    loaded_weight NUMERIC(15,2) NOT NULL,
    empty_weight NUMERIC(15,2) NOT NULL,
    deducted_weight NUMERIC(15,2) DEFAULT 0,
    net_weight NUMERIC(15,2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_vw_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicle_weights_vehicle_id ON vehicle_weights(vehicle_id);

-- net_weight is pre-computed by frontend and stored as-is
-- Backend does NOT recalculate: net_weight = loaded - empty

-- 5.3 sellers_in_vehicle
-- Maps sellers (and optional brokers) to vehicle arrivals.
CREATE TABLE sellers_in_vehicle (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    contact_id BIGINT NOT NULL,
    broker_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_siv_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_siv_contact FOREIGN KEY (contact_id)
        REFERENCES contacts(id),
    CONSTRAINT fk_siv_broker FOREIGN KEY (broker_id)
        REFERENCES contacts(id)
);

CREATE INDEX idx_siv_vehicle_id ON sellers_in_vehicle(vehicle_id);
CREATE INDEX idx_siv_contact_id ON sellers_in_vehicle(contact_id);
CREATE INDEX idx_siv_broker_id ON sellers_in_vehicle(broker_id);

-- 5.4 lots
-- Seller lot entries per commodity with bag count, serial numbering, and lifecycle status tracking. Lot identity format: LotName {₹Rate} — rate concatenated on financial event.
CREATE TABLE lots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    seller_vehicle_id BIGINT NOT NULL,
    commodity_id BIGINT NOT NULL,
    lot_name VARCHAR(50) NOT NULL,
    lot_number INT,
    bag_count INT NOT NULL CHECK (bag_count > 0),
    seller_serial_no INT NOT NULL,
    status lot_status_enum DEFAULT 'OPEN',
    base_rate NUMERIC(15,2),
    display_identity VARCHAR(100),
    source_type VARCHAR(30) DEFAULT 'ARRIVAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_lots_sv FOREIGN KEY (seller_vehicle_id)
        REFERENCES sellers_in_vehicle(id) ON DELETE CASCADE,
    CONSTRAINT fk_lots_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id)
);

CREATE INDEX idx_lots_seller_vehicle_id ON lots(seller_vehicle_id);
CREATE INDEX idx_lots_commodity_id ON lots(commodity_id);
CREATE INDEX idx_lots_status ON lots(status);

-- display_identity stores concatenated format: LotName {₹Rate}
-- source_type: ARRIVAL | STOCK_PURCHASE | CDN_RECEIVE
-- base_rate is pre-computed by frontend on financial events

-- 5.5 freight_calculations
-- Stores freight method, rate, total amount, advance. All amounts pre-computed by frontend.
CREATE TABLE freight_calculations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    method freight_method_enum NOT NULL,
    rate NUMERIC(15,2),
    total_amount NUMERIC(15,2),
    no_rental BOOLEAN DEFAULT FALSE,
    advance_paid NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_fc_vehicle FOREIGN KEY (vehicle_id)
        REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_freight_calculations_vehicle_id ON freight_calculations(vehicle_id);

-- total_amount is pre-computed by frontend based on method
-- Backend stores the computed value as-is, no recalculation

-- 5.6 freight_distribution
-- Stores pre-computed freight allocation across lots.
CREATE TABLE freight_distribution (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    freight_id BIGINT NOT NULL,
    lot_id BIGINT NOT NULL,
    allocated_amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_fd_freight FOREIGN KEY (freight_id)
        REFERENCES freight_calculations(id) ON DELETE CASCADE,
    CONSTRAINT fk_fd_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id)
);

CREATE INDEX idx_fd_freight_id ON freight_distribution(freight_id);
CREATE INDEX idx_fd_lot_id ON freight_distribution(lot_id);

-- allocated_amount is pre-computed by frontend and stored as-is


-- ============================================================
-- PART 6 — AUCTION TABLES
-- Auction session management, bid entries with margin presets, token advances, and self-sale tracking. All rate computations (seller_rate, buyer_rate, preset_margin) are performed by the frontend.
-- ============================================================

-- 6.1 auctions
-- Auction session linked to a lot, with conductor tracking.
CREATE TABLE auctions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lot_id BIGINT NOT NULL,
    auction_datetime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    conducted_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_auctions_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id) ON DELETE CASCADE,
    CONSTRAINT fk_auctions_conductor FOREIGN KEY (conducted_by)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_auctions_lot_id ON auctions(lot_id);

-- 6.2 auction_entries
-- Individual bids with pre-computed seller/buyer rates and margin presets. All values submitted by frontend.
CREATE TABLE auction_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_id BIGINT NOT NULL,
    buyer_id BIGINT,
    bid_rate NUMERIC(15,2) NOT NULL,
    preset_margin NUMERIC(15,2) DEFAULT 0,
    seller_rate NUMERIC(15,2) NOT NULL,
    buyer_rate NUMERIC(15,2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    is_self_sale BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ae_auction FOREIGN KEY (auction_id)
        REFERENCES auctions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ae_buyer FOREIGN KEY (buyer_id)
        REFERENCES contacts(id)
);

CREATE INDEX idx_ae_auction_id ON auction_entries(auction_id);
CREATE INDEX idx_ae_buyer_id ON auction_entries(buyer_id);

-- seller_rate, buyer_rate, preset_margin are all pre-computed by frontend
-- Backend stores as-is, no recalculation

-- 6.3 presets
-- Configurable margin presets per trader for auction pricing.
CREATE TABLE presets (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    preset_name VARCHAR(100),
    preset_type VARCHAR(20) DEFAULT 'PROFIT',
    preset_value NUMERIC(15,2) NOT NULL CHECK (preset_value >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_presets_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE
);

CREATE INDEX idx_presets_trader_id ON presets(trader_id);

-- preset_type: PROFIT | LOSS (REQ-AUC-003)

-- 6.4 token_advances
-- Token advance payments against auction entries. Amount is pre-computed by frontend.
CREATE TABLE token_advances (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_entry_id BIGINT NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ta_auction_entry FOREIGN KEY (auction_entry_id)
        REFERENCES auction_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_ta_auction_entry_id ON token_advances(auction_entry_id);

-- 6.5 scribble_pad
-- Temporary buyer entries during auction — initials and quantity recorded without full registration (REQ-AUC-006).
CREATE TABLE scribble_pad (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_id BIGINT NOT NULL,
    initials VARCHAR(20) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sp_auction FOREIGN KEY (auction_id)
        REFERENCES auctions(id) ON DELETE CASCADE
);

CREATE INDEX idx_sp_auction_id ON scribble_pad(auction_id);


-- ============================================================
-- PART 7 — WEIGHING TABLES
-- Weighing sessions with per-bag granularity, deduction tracking, and net weight summarization. All weight computations (averages, net, deductions) are performed by the frontend and stored as final values.
-- ============================================================

-- 7.1 weighing_sessions
-- Weighing session per lot — supports both Bluetooth and manual entry.
CREATE TABLE weighing_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lot_id BIGINT NOT NULL,
    original_weight NUMERIC(15,2),
    net_weight NUMERIC(15,2),
    manual_entry BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ws_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id) ON DELETE CASCADE
);

CREATE INDEX idx_ws_lot_id ON weighing_sessions(lot_id);

-- net_weight is pre-computed by frontend after deductions
-- Backend stores as-is

-- 7.2 bag_weights
-- Granular per-bag weight recording with unique bag numbering per session.
CREATE TABLE bag_weights (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL,
    bag_number INT NOT NULL CHECK (bag_number > 0),
    weight NUMERIC(15,2) NOT NULL CHECK (weight > 0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_bw_session FOREIGN KEY (session_id)
        REFERENCES weighing_sessions(id) ON DELETE CASCADE,
    CONSTRAINT uk_bag_session UNIQUE(session_id, bag_number)
);

CREATE INDEX idx_bw_session_id ON bag_weights(session_id);

-- 7.3 weight_deductions
-- Deductions applied per weighing session — govt, round-off, or custom. Values pre-computed by frontend.
CREATE TABLE weight_deductions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL,
    deduction_type deduction_type_enum,
    deduction_value NUMERIC(15,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_wd_session FOREIGN KEY (session_id)
        REFERENCES weighing_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_wd_session_id ON weight_deductions(session_id);

-- 7.4 net_weight_summary
-- Aggregated weight summary per session. All values pre-computed by frontend.
CREATE TABLE net_weight_summary (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL,
    total_bags INT,
    total_original_weight NUMERIC(15,2),
    total_deduction NUMERIC(15,2),
    final_net_weight NUMERIC(15,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_nws_session FOREIGN KEY (session_id)
        REFERENCES weighing_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_nws_session_id ON net_weight_summary(session_id);

-- All values (total_bags, total_original_weight, total_deduction, final_net_weight)
-- are pre-computed by frontend and stored as-is

-- 7.5 writers_pad_sessions
-- Tracks Bluetooth scale connections for the Writers Pad interface (REQ-WGH-010, REQ-WGH-011).
CREATE TABLE writers_pad_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    writer_id BIGINT NOT NULL,
    scale_identifier VARCHAR(100) NOT NULL,
    scale_name VARCHAR(150),
    connection_status VARCHAR(20) DEFAULT 'CONNECTED',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_wps_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_wps_writer FOREIGN KEY (writer_id)
        REFERENCES users(id)
);

CREATE INDEX idx_wps_trader_id ON writers_pad_sessions(trader_id);
CREATE INDEX idx_wps_writer_id ON writers_pad_sessions(writer_id);

-- connection_status: CONNECTED | DISCONNECTED | AVAILABLE

-- 7.6 bid_card_weights
-- Tracks weight recordings against specific bid cards. Supports retagging and RBAC-controlled deletion (REQ-WGH-012 to REQ-WGH-015).
CREATE TABLE bid_card_weights (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    wp_session_id BIGINT NOT NULL,
    auction_entry_id BIGINT NOT NULL,
    bag_number INT NOT NULL,
    weight NUMERIC(15,2) NOT NULL CHECK (weight > 0),
    is_retagged BOOLEAN DEFAULT FALSE,
    retagged_from BIGINT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by BIGINT,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_bcw_session FOREIGN KEY (wp_session_id)
        REFERENCES writers_pad_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_bcw_auction FOREIGN KEY (auction_entry_id)
        REFERENCES auction_entries(id),
    CONSTRAINT fk_bcw_retagged FOREIGN KEY (retagged_from)
        REFERENCES bid_card_weights(id),
    CONSTRAINT fk_bcw_recorded FOREIGN KEY (recorded_by)
        REFERENCES users(id),
    CONSTRAINT fk_bcw_deleted FOREIGN KEY (deleted_by)
        REFERENCES users(id)
);

CREATE INDEX idx_bcw_wp_session_id ON bid_card_weights(wp_session_id);
CREATE INDEX idx_bcw_auction_entry_id ON bid_card_weights(auction_entry_id);


-- ============================================================
-- PART 8 — SETTLEMENT TABLES (PUTY)
-- Seller settlement with rate-based clustering and itemized deductions. All financial amounts (gross, deductions, net_payable) are pre-computed by the frontend.
-- ============================================================

-- 8.1 puty
-- Seller settlement header — stores pre-computed gross, deductions, and net payable values from frontend.
CREATE TABLE puty (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    puty_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gross_amount NUMERIC(15,2) NOT NULL,
    total_deductions NUMERIC(15,2) NOT NULL,
    net_payable NUMERIC(15,2) NOT NULL,
    is_estimated BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_puty_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_puty_seller FOREIGN KEY (seller_id)
        REFERENCES contacts(id)
);

CREATE INDEX idx_puty_trader_id ON puty(trader_id);
CREATE INDEX idx_puty_seller_id ON puty(seller_id);

-- gross_amount, total_deductions, net_payable are all pre-computed by frontend
-- Backend stores as-is, no recalculation

-- 8.2 puty_rate_clusters
-- Stores pre-computed rate-based clustering amounts from frontend.
CREATE TABLE puty_rate_clusters (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    puty_id BIGINT NOT NULL,
    rate NUMERIC(15,2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_prc_puty FOREIGN KEY (puty_id)
        REFERENCES puty(id) ON DELETE CASCADE
);

CREATE INDEX idx_prc_puty_id ON puty_rate_clusters(puty_id);

-- 8.3 puty_deductions
-- Itemized deductions on seller settlement. Amounts pre-computed by frontend.
CREATE TABLE puty_deductions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    puty_id BIGINT NOT NULL,
    deduction_type VARCHAR(100),
    amount NUMERIC(15,2) NOT NULL,
    editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_pd_puty FOREIGN KEY (puty_id)
        REFERENCES puty(id) ON DELETE CASCADE
);

CREATE INDEX idx_pd_puty_id ON puty_deductions(puty_id);


-- ============================================================
-- PART 9 — BILLING TABLES (BUYER SIDE)
-- Sales bill generation, line items, charges, and tax records. All amounts, taxes, and totals are pre-computed by the frontend. Backend performs no calculation logic.
-- ============================================================

-- 9.1 sales_bills
-- Buyer invoice header with unique bill numbering. Version-controlled. All financial amounts pre-computed by frontend.
CREATE TABLE sales_bills (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    bill_number VARCHAR(50) NOT NULL,
    bill_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
    version INT DEFAULT 1,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_by BIGINT,
    billing_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sb_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_sb_buyer FOREIGN KEY (buyer_id)
        REFERENCES contacts(id),
    CONSTRAINT fk_sb_locked_by FOREIGN KEY (locked_by)
        REFERENCES users(id),
    CONSTRAINT uk_bill_number UNIQUE(trader_id, bill_number)
);

CREATE INDEX idx_sb_trader_id ON sales_bills(trader_id);
CREATE INDEX idx_sb_buyer_id ON sales_bills(buyer_id);
CREATE INDEX idx_sb_bill_number ON sales_bills(bill_number);
CREATE INDEX idx_sb_bill_date ON sales_bills(bill_date);

-- 9.2 bill_items
-- Line items per bill. All amounts (rate, quantity, total) pre-computed by frontend.
CREATE TABLE bill_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT NOT NULL,
    lot_id BIGINT,
    commodity_id BIGINT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    weight NUMERIC(15,2),
    rate NUMERIC(15,2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    hsn_code VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_bi_bill FOREIGN KEY (bill_id)
        REFERENCES sales_bills(id) ON DELETE CASCADE,
    CONSTRAINT fk_bi_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id),
    CONSTRAINT fk_bi_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id)
);

CREATE INDEX idx_bi_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bi_lot_id ON bill_items(lot_id);
CREATE INDEX idx_bi_commodity_id ON bill_items(commodity_id);

-- rate and amount are pre-computed by frontend (New Rate logic)
-- Backend stores as-is, no recalculation

-- 9.3 bill_charges
-- Dynamic charges applied to bill. Amounts pre-computed by frontend.
CREATE TABLE bill_charges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT NOT NULL,
    charge_id BIGINT,
    charge_name VARCHAR(150) NOT NULL,
    charge_type charge_type_enum,
    amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_bc_bill FOREIGN KEY (bill_id)
        REFERENCES sales_bills(id) ON DELETE CASCADE,
    CONSTRAINT fk_bc_charge FOREIGN KEY (charge_id)
        REFERENCES dynamic_charges(id)
);

CREATE INDEX idx_bc_bill_id ON bill_charges(bill_id);

-- 9.4 bill_taxes
-- Per-item tax breakdown. All tax amounts (commission, user fee, GST components) pre-computed by frontend.
CREATE TABLE bill_taxes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_item_id BIGINT NOT NULL,
    commission_amount NUMERIC(15,2) DEFAULT 0,
    user_fee_amount NUMERIC(15,2) DEFAULT 0,
    cgst_amount NUMERIC(15,2) DEFAULT 0,
    sgst_amount NUMERIC(15,2) DEFAULT 0,
    igst_amount NUMERIC(15,2) DEFAULT 0,
    taxable_amount NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_bt_item FOREIGN KEY (bill_item_id)
        REFERENCES bill_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_bt_bill_item_id ON bill_taxes(bill_item_id);

-- All tax amounts are pre-computed by frontend
-- Backend stores as-is, no recalculation

-- 9.5 bill_locks
-- Concurrency control for bill editing — prevents multi-user simultaneous editing (REQ-BIL-012).
CREATE TABLE bill_locks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT NOT NULL,
    locked_by BIGINT NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    release_requested BOOLEAN DEFAULT FALSE,
    release_requested_by BIGINT,
    CONSTRAINT fk_bl_bill FOREIGN KEY (bill_id)
        REFERENCES sales_bills(id) ON DELETE CASCADE,
    CONSTRAINT fk_bl_user FOREIGN KEY (locked_by)
        REFERENCES users(id),
    CONSTRAINT fk_bl_requester FOREIGN KEY (release_requested_by)
        REFERENCES users(id),
    CONSTRAINT uk_bill_lock UNIQUE(bill_id)
);

CREATE INDEX idx_bl_bill_id ON bill_locks(bill_id);

-- 9.6 invoice_sequences
-- Commodity-based invoice numbering with financial period reset (REQ-BIL-014).
CREATE TABLE invoice_sequences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    sequence_type VARCHAR(30) NOT NULL,
    commodity_id BIGINT,
    financial_year VARCHAR(10) NOT NULL,
    prefix VARCHAR(20),
    current_number INT DEFAULT 0,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_is_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_is_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id),
    CONSTRAINT uk_sequence UNIQUE(trader_id, sequence_type, commodity_id, financial_year)
);

CREATE INDEX idx_is_trader_id ON invoice_sequences(trader_id);

-- sequence_type: BUYER_BILL | SELLER_INVOICE | VEHICLE_INVOICE


-- ============================================================
-- PART 10 — FINANCIAL TABLES
-- Voucher lifecycle, double-entry voucher items, payments, brokerage, payment allocation, payment accounts, financial periods, and opening balances. All financial amounts are pre-computed by the frontend. Backend stores and validates structure only.
-- ============================================================

-- 10.1 vouchers
-- Auto-triggered vouchers with lifecycle status and type classification. Amount pre-computed by frontend.
CREATE TABLE vouchers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    voucher_type voucher_type_enum DEFAULT 'OPERATIONAL',
    reference_type VARCHAR(50),
    reference_id BIGINT,
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    status voucher_status_enum DEFAULT 'DRAFT',
    is_migrated BOOLEAN DEFAULT FALSE,
    migration_type VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_vouchers_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE
);

CREATE INDEX idx_vouchers_trader_id ON vouchers(trader_id);
CREATE INDEX idx_vouchers_status ON vouchers(status);

-- Status lifecycle: DRAFT → POSTED → PARTIALLY_SETTLED → CLOSED → REVERSED
-- amount is pre-computed by frontend

-- 10.2 voucher_items
-- Debit/credit line items per voucher. All amounts pre-computed by frontend.
CREATE TABLE voucher_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id BIGINT NOT NULL,
    ledger_id BIGINT NOT NULL,
    debit NUMERIC(15,2) DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(15,2) DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_vi_voucher FOREIGN KEY (voucher_id)
        REFERENCES vouchers(id) ON DELETE CASCADE,
    CONSTRAINT fk_vi_ledger FOREIGN KEY (ledger_id)
        REFERENCES ledgers(id),
    CONSTRAINT chk_voucher_debit_credit CHECK (
        (debit > 0 AND credit = 0) OR
        (credit > 0 AND debit = 0)
    )
);

CREATE INDEX idx_vi_voucher_id ON voucher_items(voucher_id);
CREATE INDEX idx_vi_ledger_id ON voucher_items(ledger_id);

-- 10.3 payments
-- Payment entries against vouchers. Amount pre-computed by frontend.
CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id BIGINT NOT NULL,
    payment_mode payment_mode_enum,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_payments_voucher FOREIGN KEY (voucher_id)
        REFERENCES vouchers(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_voucher_id ON payments(voucher_id);

-- 10.4 brokerage_accumulation
-- Periodic brokerage tracking per broker. Amount pre-computed by frontend.
CREATE TABLE brokerage_accumulation (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    broker_id BIGINT NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    amount NUMERIC(15,2),
    accumulated_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ba_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_ba_broker FOREIGN KEY (broker_id)
        REFERENCES contacts(id)
);

CREATE INDEX idx_ba_trader_id ON brokerage_accumulation(trader_id);
CREATE INDEX idx_ba_broker_id ON brokerage_accumulation(broker_id);

-- 10.5 payment_allocations
-- Document-level payment allocation. All amounts (allocated, original, outstanding_after) pre-computed by frontend (REQ-FIN-012).
CREATE TABLE payment_allocations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id BIGINT NOT NULL,
    allocated_amount NUMERIC(15,2) NOT NULL CHECK (allocated_amount > 0),
    original_amount NUMERIC(15,2) NOT NULL,
    outstanding_after NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_advance_conversion BOOLEAN DEFAULT FALSE,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_pa_payment FOREIGN KEY (payment_id)
        REFERENCES payments(id) ON DELETE CASCADE
);

CREATE INDEX idx_pa_payment_id ON payment_allocations(payment_id);

-- All amounts pre-computed by frontend
-- reference_type: BILL | PUTY | VOUCHER

-- 10.6 payment_accounts
-- Configurable payment accounts per trader — bank, UPI, cash (REQ-FIN-014).
CREATE TABLE payment_accounts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(30) NOT NULL,
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    upi_id VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    ledger_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_pac_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_pac_ledger FOREIGN KEY (ledger_id)
        REFERENCES ledgers(id)
);

CREATE INDEX idx_pac_trader_id ON payment_accounts(trader_id);
CREATE INDEX idx_pac_ledger_id ON payment_accounts(ledger_id);

-- account_type: CASH | BANK | UPI

-- 10.7 financial_periods
-- Financial year and period management with lock controls (REQ-FIN-016).
CREATE TABLE financial_periods (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_label VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_by BIGINT,
    is_gst_locked BOOLEAN DEFAULT FALSE,
    gst_locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_fp_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_fp_locked_by FOREIGN KEY (locked_by)
        REFERENCES users(id)
);

CREATE INDEX idx_fp_trader_id ON financial_periods(trader_id);

-- period_type: FINANCIAL_YEAR | QUARTER | MONTH
-- is_locked: Blocks all new transactions in this period
-- is_gst_locked: Blocks GST-related modifications separately

-- 10.8 opening_balances
-- Mid-year tenant onboarding opening balance records. Amounts pre-computed by frontend (REQ-FIN-015).
CREATE TABLE opening_balances (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    voucher_id BIGINT NOT NULL,
    ledger_id BIGINT NOT NULL,
    contact_id BIGINT,
    debit NUMERIC(15,2) DEFAULT 0,
    credit NUMERIC(15,2) DEFAULT 0,
    migration_type VARCHAR(20) NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ob_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ob_voucher FOREIGN KEY (voucher_id)
        REFERENCES vouchers(id),
    CONSTRAINT fk_ob_ledger FOREIGN KEY (ledger_id)
        REFERENCES ledgers(id),
    CONSTRAINT fk_ob_contact FOREIGN KEY (contact_id)
        REFERENCES contacts(id)
);

CREATE INDEX idx_ob_trader_id ON opening_balances(trader_id);
CREATE INDEX idx_ob_voucher_id ON opening_balances(voucher_id);
CREATE INDEX idx_ob_ledger_id ON opening_balances(ledger_id);

-- migration_type: CONSOLIDATED (Option A) | LEDGER_WISE (Option B)
-- All debit/credit amounts are pre-computed by frontend


-- ============================================================
-- PART 11 — SELF-SALE & STOCK PURCHASE TABLES
-- Self-sale closure with business mode support, stock purchase with cost allocation, and inventory management. All financial amounts and rates are pre-computed by the frontend.
-- ============================================================

-- 11.1 self_sale_closures
-- Records self-sale lot closures. Applied rate and voucher linkage — all values pre-computed by frontend.
CREATE TABLE self_sale_closures (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    lot_id BIGINT NOT NULL,
    auction_entry_id BIGINT,
    applied_rate NUMERIC(15,2) NOT NULL,
    business_mode business_mode_enum NOT NULL,
    voucher_id BIGINT,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_by BIGINT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ssc_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ssc_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id),
    CONSTRAINT fk_ssc_auction FOREIGN KEY (auction_entry_id)
        REFERENCES auction_entries(id),
    CONSTRAINT fk_ssc_voucher FOREIGN KEY (voucher_id)
        REFERENCES vouchers(id),
    CONSTRAINT fk_ssc_user FOREIGN KEY (closed_by)
        REFERENCES users(id)
);

CREATE INDEX idx_ssc_trader_id ON self_sale_closures(trader_id);
CREATE INDEX idx_ssc_lot_id ON self_sale_closures(lot_id);

-- 11.2 stock_purchases
-- Stock purchase header. All amounts pre-computed by frontend.
CREATE TABLE stock_purchases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    vendor_id BIGINT NOT NULL,
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(15,2) NOT NULL,
    total_charges NUMERIC(15,2) DEFAULT 0,
    voucher_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sp_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_sp_vendor FOREIGN KEY (vendor_id)
        REFERENCES contacts(id),
    CONSTRAINT fk_sp_voucher FOREIGN KEY (voucher_id)
        REFERENCES vouchers(id)
);

CREATE INDEX idx_sp_trader_id ON stock_purchases(trader_id);
CREATE INDEX idx_sp_vendor_id ON stock_purchases(vendor_id);

-- 11.3 stock_purchase_items
-- Line items per purchase. All amounts and effective_base_rate pre-computed by frontend.
CREATE TABLE stock_purchase_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_id BIGINT NOT NULL,
    commodity_id BIGINT NOT NULL,
    lot_id BIGINT,
    quantity INT NOT NULL CHECK (quantity > 0),
    rate NUMERIC(15,2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    allocated_charges NUMERIC(15,2) DEFAULT 0,
    effective_base_rate NUMERIC(15,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_spi_purchase FOREIGN KEY (purchase_id)
        REFERENCES stock_purchases(id) ON DELETE CASCADE,
    CONSTRAINT fk_spi_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id),
    CONSTRAINT fk_spi_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id)
);

CREATE INDEX idx_spi_purchase_id ON stock_purchase_items(purchase_id);
CREATE INDEX idx_spi_commodity_id ON stock_purchase_items(commodity_id);

-- effective_base_rate is pre-computed by frontend
-- Backend stores as-is, no recalculation

-- 11.4 stock_purchase_charges
-- Charges on purchases — freight, loading, handling. Amounts pre-computed by frontend.
CREATE TABLE stock_purchase_charges (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purchase_id BIGINT NOT NULL,
    charge_name VARCHAR(150) NOT NULL,
    charge_amount NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_spc_purchase FOREIGN KEY (purchase_id)
        REFERENCES stock_purchases(id) ON DELETE CASCADE
);

CREATE INDEX idx_spc_purchase_id ON stock_purchase_charges(purchase_id);


-- ============================================================
-- PART 12 — CDN & MERCOTRACE TABLES
-- Consignment Dispatch Note lifecycle, multi-source population, PIN-based transfer, and arrival conversion. All amounts pre-computed by frontend.
-- ============================================================

-- 12.1 cdn
-- CDN header — auto-generated number, dispatching/receiving parties, status tracking (REQ-CDN-001).
CREATE TABLE cdn (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    cdn_number VARCHAR(50) NOT NULL,
    cdn_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatching_party_id BIGINT NOT NULL,
    receiving_party_id BIGINT NOT NULL,
    source cdn_source_enum NOT NULL,
    source_reference_id BIGINT,
    transporter_name VARCHAR(150),
    driver_name VARCHAR(150),
    driver_phone VARCHAR(20),
    vehicle_number VARCHAR(50),
    freight_amount NUMERIC(15,2) DEFAULT 0,
    advance_paid NUMERIC(15,2) DEFAULT 0,
    remarks TEXT,
    status cdn_status_enum DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_cdn_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE,
    CONSTRAINT fk_cdn_dispatcher FOREIGN KEY (dispatching_party_id)
        REFERENCES contacts(id),
    CONSTRAINT fk_cdn_receiver FOREIGN KEY (receiving_party_id)
        REFERENCES contacts(id),
    CONSTRAINT uk_cdn_number UNIQUE(trader_id, cdn_number)
);

CREATE INDEX idx_cdn_trader_id ON cdn(trader_id);
CREATE INDEX idx_cdn_status ON cdn(status);

-- CDN is operational document only — NO GL posting
-- freight_amount, advance_paid are pre-computed by frontend

-- 12.2 cdn_items
-- Line items per CDN — lot details, commodity, quantity.
CREATE TABLE cdn_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cdn_id BIGINT NOT NULL,
    lot_id BIGINT,
    commodity_id BIGINT NOT NULL,
    lot_name VARCHAR(50),
    quantity INT NOT NULL CHECK (quantity > 0),
    variant VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_cdni_cdn FOREIGN KEY (cdn_id)
        REFERENCES cdn(id) ON DELETE CASCADE,
    CONSTRAINT fk_cdni_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id),
    CONSTRAINT fk_cdni_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id)
);

CREATE INDEX idx_cdni_cdn_id ON cdn_items(cdn_id);
CREATE INDEX idx_cdni_lot_id ON cdn_items(lot_id);

-- 12.3 cdn_transfers
-- Secure PIN-based CDN transfer between traders. PIN is one-time use with configurable expiry (REQ-CDN-009 to REQ-CDN-011).
CREATE TABLE cdn_transfers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cdn_id BIGINT NOT NULL,
    sender_trader_id BIGINT NOT NULL,
    receiver_trader_id BIGINT,
    pin_hash VARCHAR(255) NOT NULL,
    pin_expiry TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_arrival_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_cdnt_cdn FOREIGN KEY (cdn_id)
        REFERENCES cdn(id) ON DELETE CASCADE,
    CONSTRAINT fk_cdnt_sender FOREIGN KEY (sender_trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_cdnt_receiver FOREIGN KEY (receiver_trader_id)
        REFERENCES traders(id)
);

CREATE INDEX idx_cdnt_cdn_id ON cdn_transfers(cdn_id);

-- PIN must be one-time usable (is_used flag)
-- CDN data immutable post-transfer

-- 12.4 goods_in_transit
-- Optional goods-in-transit tracking triggered by CDN dispatch (REQ-CDN-008).
CREATE TABLE goods_in_transit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    cdn_id BIGINT NOT NULL,
    lot_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_at TIMESTAMPTZ,
    freight_advance NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_git_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_git_cdn FOREIGN KEY (cdn_id)
        REFERENCES cdn(id),
    CONSTRAINT fk_git_lot FOREIGN KEY (lot_id)
        REFERENCES lots(id)
);

CREATE INDEX idx_git_trader_id ON goods_in_transit(trader_id);
CREATE INDEX idx_git_cdn_id ON goods_in_transit(cdn_id);


-- ============================================================
-- PART 13 — PRINT & REPORT CONFIGURATION TABLES
-- Print templates, daily serials, print audit log, market fee compliance, party exposure, and seller invoices. Amounts are pre-computed by frontend.
-- ============================================================

-- 13.1 print_templates
-- Configurable print output templates per trader (REQ-PRN-001, REQ-PRN-002).
CREATE TABLE print_templates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    print_format print_format_enum NOT NULL,
    print_stage print_stage_enum NOT NULL,
    is_pre_printed BOOLEAN DEFAULT FALSE,
    copy_count INT DEFAULT 1,
    copy_name VARCHAR(50),
    rate_basis_from_commodity BOOLEAN DEFAULT TRUE,
    conditional_content JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_pt_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id) ON DELETE CASCADE
);

CREATE INDEX idx_pt_trader_id ON print_templates(trader_id);

-- 13.2 daily_serials
-- Auto-incrementing daily serial counters per trader (REQ-LOG-001, REQ-LOG-002).
CREATE TABLE daily_serials (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    serial_date DATE NOT NULL,
    seller_serial INT DEFAULT 0,
    lot_serial INT DEFAULT 0,
    cdn_serial INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT uk_serial_per_day UNIQUE(trader_id, serial_date),
    CONSTRAINT fk_ds_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id)
);

CREATE INDEX idx_ds_trader_id ON daily_serials(trader_id);

-- 13.3 print_log
-- Audit trail of all print operations — user attribution and template reference.
CREATE TABLE print_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    template_id BIGINT,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    print_type VARCHAR(50),
    print_format print_format_enum,
    printed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    printed_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_pl_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_pl_template FOREIGN KEY (template_id)
        REFERENCES print_templates(id),
    CONSTRAINT fk_pl_user FOREIGN KEY (printed_by)
        REFERENCES users(id)
);

CREATE INDEX idx_pl_trader_id ON print_log(trader_id);

-- 13.4 market_fee_entries
-- Market fee compliance tracking per commodity. Amounts pre-computed by frontend (REQ-PRN-016, REQ-RPT-010).
CREATE TABLE market_fee_entries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    bill_id BIGINT NOT NULL,
    commodity_id BIGINT NOT NULL,
    bags INT NOT NULL DEFAULT 1,
    buyer_gross NUMERIC(15,2) NOT NULL,
    market_fee_rate NUMERIC(6,2) NOT NULL,
    market_fee_amount NUMERIC(15,2) NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    payment_amount NUMERIC(15,2),
    payment_mode payment_mode_enum,
    payment_date TIMESTAMPTZ,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_mfe_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_mfe_bill FOREIGN KEY (bill_id)
        REFERENCES sales_bills(id),
    CONSTRAINT fk_mfe_commodity FOREIGN KEY (commodity_id)
        REFERENCES commodities(id)
);

CREATE INDEX idx_mfe_trader_id ON market_fee_entries(trader_id);
CREATE INDEX idx_mfe_bill_id ON market_fee_entries(bill_id);

-- market_fee_amount is pre-computed by frontend
-- Backend stores as-is, no recalculation

-- 13.5 party_exposure
-- Party-level exposure summary. All amounts pre-computed by frontend (REQ-RPT-008).
CREATE TABLE party_exposure (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    contact_id BIGINT NOT NULL,
    total_sale NUMERIC(15,2) DEFAULT 0,
    total_collected NUMERIC(15,2) DEFAULT 0,
    outstanding NUMERIC(15,2) DEFAULT 0,
    oldest_due_date TIMESTAMPTZ,
    risk_level risk_level_enum DEFAULT 'LOW',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_pe_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_pe_contact FOREIGN KEY (contact_id)
        REFERENCES contacts(id),
    CONSTRAINT uk_trader_party UNIQUE(trader_id, contact_id)
);

CREATE INDEX idx_pe_trader_id ON party_exposure(trader_id);
CREATE INDEX idx_pe_contact_id ON party_exposure(contact_id);

-- All amounts pre-computed by frontend
-- risk_level determined by frontend based on oldest_due_date

-- 13.6 seller_invoices
-- Seller settlement invoices (Patti). All amounts pre-computed by frontend (REQ-PRN-013 to REQ-PRN-015).
CREATE TABLE seller_invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    puty_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gross_amount NUMERIC(15,2) NOT NULL,
    total_deductions NUMERIC(15,2) DEFAULT 0,
    net_amount NUMERIC(15,2) NOT NULL,
    print_format print_format_enum DEFAULT 'A5_PORTRAIT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_si_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_si_puty FOREIGN KEY (puty_id)
        REFERENCES puty(id),
    CONSTRAINT fk_si_seller FOREIGN KEY (seller_id)
        REFERENCES contacts(id),
    CONSTRAINT uk_seller_invoice UNIQUE(trader_id, invoice_number)
);

CREATE INDEX idx_si_trader_id ON seller_invoices(trader_id);
CREATE INDEX idx_si_puty_id ON seller_invoices(puty_id);
CREATE INDEX idx_si_seller_id ON seller_invoices(seller_id);

-- All amounts pre-computed by frontend


-- ============================================================
-- PART 14 — AUDIT & MODIFICATION CONTROL TABLES
-- Version-controlled modifications, settlement locks, field-level edit tracking, weight audit trail, and voucher status logging. Immutable audit records — soft delete not applicable on audit tables.
-- ============================================================

-- 14.1 bill_modifications
-- Version-controlled billing modifications — original/revised/difference/reason/user (REQ-AUD-001, REQ-AUD-002).
CREATE TABLE bill_modifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id BIGINT NOT NULL,
    version INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    original_value TEXT,
    revised_value TEXT,
    difference NUMERIC(15,2),
    reason TEXT,
    modified_by BIGINT NOT NULL,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    CONSTRAINT fk_bm_bill FOREIGN KEY (bill_id)
        REFERENCES sales_bills(id) ON DELETE CASCADE,
    CONSTRAINT fk_bm_user FOREIGN KEY (modified_by)
        REFERENCES users(id)
);

CREATE INDEX idx_bm_bill_id ON bill_modifications(bill_id);

-- Immutable change log — records can never be deleted

-- 14.2 settlement_locks
-- Settlement lock tracking — prevents further modifications (REQ-AUD-003).
CREATE TABLE settlement_locks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id BIGINT NOT NULL,
    locked_by BIGINT NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    CONSTRAINT fk_sl_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_sl_user FOREIGN KEY (locked_by)
        REFERENCES users(id),
    CONSTRAINT uk_lock UNIQUE(trader_id, reference_type, reference_id)
);

CREATE INDEX idx_sl_trader_id ON settlement_locks(trader_id);

-- reference_type: BILL | PUTY | VOUCHER

-- 14.3 edit_log
-- Field-level change tracking triggered by Alt+M master edit unlock (REQ-PUT-009).
CREATE TABLE edit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trader_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    CONSTRAINT fk_el_trader FOREIGN KEY (trader_id)
        REFERENCES traders(id),
    CONSTRAINT fk_el_user FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE INDEX idx_el_trader_id ON edit_log(trader_id);
CREATE INDEX idx_el_reference ON edit_log(reference_type, reference_id);

-- 14.4 weight_audit
-- Weighing session audit trail — original, net, manual flag snapshots.
CREATE TABLE weight_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id BIGINT NOT NULL,
    original_weight NUMERIC(15,2),
    net_weight NUMERIC(15,2),
    manual_flag BOOLEAN,
    audited_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    CONSTRAINT fk_wa_session FOREIGN KEY (session_id)
        REFERENCES weighing_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_wa_session_id ON weight_audit(session_id);

-- 14.5 voucher_status_log
-- Tracks voucher status transitions with user attribution.
CREATE TABLE voucher_status_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    voucher_id BIGINT NOT NULL,
    old_status voucher_status_enum,
    new_status voucher_status_enum,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    CONSTRAINT fk_vsl_voucher FOREIGN KEY (voucher_id)
        REFERENCES vouchers(id) ON DELETE CASCADE,
    CONSTRAINT fk_vsl_user FOREIGN KEY (changed_by)
        REFERENCES users(id)
);

CREATE INDEX idx_vsl_voucher_id ON voucher_status_log(voucher_id);
