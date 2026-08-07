# Project Requirement

## Project Name

**IR Souvenir Stock Management System**

---

# Project Overview

Build a responsive web-based inventory management system for managing souvenir stock.

The application will replace the existing Excel-based stock book with a modern online application.

The application must be lightweight, easy to maintain, and deployable using **GitHub Pages + Supabase** without requiring PHP, Laravel, or any traditional backend server.

The application must work on:

* Desktop
* Tablet
* Mobile

---

# Technology Stack

Frontend

* HTML5
* Bootstrap 5
* Vanilla JavaScript (ES6 Modules)

Backend

* Supabase JavaScript SDK

Database

* PostgreSQL (Supabase)

Authentication

* Supabase Authentication

Hosting

* GitHub Pages

Version Control

* GitHub

Do NOT use:

* PHP
* Laravel
* Node.js backend
* Express
* Firebase
* Google Apps Script

The application must be entirely frontend-based while using Supabase as Backend-as-a-Service.

---

# Main Features

## Authentication

Users can:

* Login
* Logout

Only authenticated users may access the application.

---

## Dashboard

Display:

* Total Items
* Current Stock
* Total Incoming This Month
* Total Outgoing This Month
* Low Stock Items

Charts:

* Monthly Incoming Transactions
* Monthly Outgoing Transactions
* Top 10 Most Used Items

---

## Master Items

CRUD:

* Create Item
* Edit Item
* Delete Item
* Search Item

Fields:

* Item Code
* Item Name
* Description
* Initial Stock
* Current Stock (Read Only)
* Created Date

Item Code must be automatically generated.

Example:

BRG0001

BRG0002

BRG0003

Users must never manually type Item Code.

---

## Incoming Transaction

Users can:

Create Incoming Transaction.

Fields:

* Date
* Item
* Quantity
* PIC
* Description

Rules:

Current Stock

=

Current Stock

*

Quantity

---

## Outgoing Transaction

Users can:

Create Outgoing Transaction.

Fields:

* Date
* Item
* Quantity
* PIC
* Purpose

Rules:

Current Stock

=

Current Stock

*

Quantity

System must reject transaction if stock is insufficient.

---

## Transaction History

Display every stock movement.

Columns:

* Date
* Item
* Type
* Quantity
* PIC
* Description

Filters:

* Date
* Month
* Item
* Transaction Type

Search supported.

---

## Reports

Generate reports based on:

* Daily
* Monthly
* Yearly

Support:

* Print
* Export CSV

---

# Database Design

## Table: items

id (uuid)

item_code

item_name

description

initial_stock

current_stock

created_at

updated_at

---

## Table: transactions

id (uuid)

item_id

transaction_date

transaction_type

quantity

pic

description

created_at

transaction_type values:

IN

OUT

---

## Table: users

Use Supabase Authentication.

No custom password implementation.

---

# Business Rules

1.

Item Code generated automatically.

Example:

BRG0001

2.

Current Stock cannot become negative.

3.

Deleting an item is only allowed when no transaction exists.

4.

Every stock movement must create a transaction record.

Never update stock directly without creating transaction history.

5.

Current Stock must always equal:

Initial Stock

*

Total Incoming

*

Total Outgoing

6.

Display warning when stock reaches below configurable minimum (default: 10 units).

---

# User Interface

Use Admin Dashboard layout.

Left Sidebar

* Dashboard
* Items
* Incoming
* Outgoing
* History
* Reports

Top Navbar

* User Profile
* Logout

Responsive Design

Desktop

Tablet

Mobile

Use Bootstrap Icons.

Avoid unnecessary animations.

Use clean and modern interface.

---

# Folder Structure

/assets
/css
/js
/components
/pages
/services
/utils

index.html

login.html

dashboard.html

items.html

incoming.html

outgoing.html

history.html

reports.html

---

# JavaScript Architecture

Separate logic into modules.

Example:

auth.js

supabase.js

items.js

transactions.js

dashboard.js

reports.js

utils.js

Avoid writing all logic inside one file.

---

# Coding Standard

Use:

* async/await
* ES6 Modules
* Bootstrap Components
* Fetch through Supabase SDK

Avoid:

* jQuery
* Inline JavaScript
* Inline CSS

---

# Future Ready

Structure the project so future features can be added easily:

* Barcode / QR Code
* Stock Adjustment
* Multi Warehouse
* Category
* Supplier
* Borrow & Return
* Approval Workflow

Do not tightly couple the application.

Use reusable components.

---

# Deliverables

Generate:

1. Complete folder structure

2. Responsive UI

3. Supabase integration

4. SQL schema

5. Authentication

6. CRUD pages

7. Dashboard

8. Charts

9. Transaction History

10. Report page

11. Clean reusable JavaScript modules

12. README.md explaining installation, Supabase configuration, deployment to GitHub Pages, and project architecture.


<!-- Password supabase -->
.NJ4Es&NdB2.+kn