# Data Model

## Overview

MongoDB is accessed through Mongoose models with aliases in `Customer` to expose readable API field names while storing compact keys.

## Customer Model (`lib/models/Customer.ts`)

### Core Fields

- `policyHolderName` (alias of `phn`)
  - `first` (required)
  - `mid` (optional, default empty string)
  - `surname` (required)
- `age` (alias `a`, number, required, min 0)
- `mobileNumber` (alias `mob`, required)
- `weight` (alias `w`, required, min 0)
- `height` (alias `h`, required, min 0)
- `policyNumber` (alias `pn`, required, unique, indexed)
- `policyNames` (alias `pnm`, required, max length 150)
- `sumAssured` (alias `sa`, required, min 0)
- `premiumAmount` (alias `pa`, required, min 0)
- `policyTerm` (alias `pt`, required, min 0)
- `emi` (alias `e`)
  - `status` (required boolean)
  - `amount` (required number, min 0)
- `provider` (alias `pr`, enum: STAR | LIC)
- `dateOfBirth` (alias `dob`, date, required)
- `premiumMode` (alias `pm`, enum: M | Q | A | L)
- `customerCode` (alias `cc`, required, unique, indexed)
- `startDate` (alias `sd`, required)
- `endDate` (alias `ed`, required)

### Indexes

- Unique index on `policyNumber`.
- Unique index on `customerCode`.
- Text index over `policyHolderName.first`, `policyHolderName.mid`, `policyHolderName.surname`.

### Schema Options

- `timestamps: true`
- `versionKey: false`
- JSON/Object virtuals enabled

## User Model (`lib/models/User.ts`)

### Fields

- `username` (required)
- `email` (optional, normalized lowercase)
- `idp` (required, uppercase, default `LOCAL`)
- `passwordHash` (required)

### Indexes

- Unique compound index on `{ username, idp }`

## IdentityProvider Model (`lib/models/IdentityProvider.ts`)

This model is currently defined but not actively wired into runtime auth flow.

### Fields

- `key` (required, unique, uppercase)
- `displayName` (required)
- `enabled` (boolean default true)

## Why Alias-Based Storage Is Used

- Reduces document size in MongoDB.
- Keeps frontend and API payloads expressive (`policyNumber`, `customerCode`, etc.).
- Allows seamless translation during updates with Mongoose alias translation.
