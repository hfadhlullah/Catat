/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminMigrations from "../adminMigrations.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as debugAuth from "../debugAuth.js";
import type * as expenses from "../expenses.js";
import type * as http from "../http.js";
import type * as imports from "../imports.js";
import type * as incomes from "../incomes.js";
import type * as ocr from "../ocr.js";
import type * as profile from "../profile.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";
import type * as walletBudgets from "../walletBudgets.js";
import type * as walletSharing from "../walletSharing.js";
import type * as wallets from "../wallets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminMigrations: typeof adminMigrations;
  auth: typeof auth;
  categories: typeof categories;
  debugAuth: typeof debugAuth;
  expenses: typeof expenses;
  http: typeof http;
  imports: typeof imports;
  incomes: typeof incomes;
  ocr: typeof ocr;
  profile: typeof profile;
  transactions: typeof transactions;
  users: typeof users;
  vendors: typeof vendors;
  walletBudgets: typeof walletBudgets;
  walletSharing: typeof walletSharing;
  wallets: typeof wallets;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
