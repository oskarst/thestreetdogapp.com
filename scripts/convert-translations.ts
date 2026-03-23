/**
 * Translation conversion script: .po files -> JSON for next-intl
 *
 * Reads .po files from the Flask app's translations directory, parses
 * msgid/msgstr pairs, organizes them into structured JSON sections,
 * and writes to src/i18n/messages/{en,ka,ru}.json.
 *
 * Usage: npx tsx scripts/convert-translations.ts
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PO_BASE = "/Users/pooka/Documents/Workspace/thestreetdogapp2/translations";
const OUTPUT_DIR = path.resolve(__dirname, "../src/i18n/messages");
const LOCALES = ["en", "ka", "ru"] as const;

// ---------------------------------------------------------------------------
// .po parser
// ---------------------------------------------------------------------------

interface PoEntry {
  msgid: string;
  msgstr: string;
}

function parsePo(content: string): PoEntry[] {
  const entries: PoEntry[] = [];
  const lines = content.split("\n");

  let currentMsgid = "";
  let currentMsgstr = "";
  let readingMsgid = false;
  let readingMsgstr = false;
  let isHeader = true;

  function flushEntry() {
    if (currentMsgid && currentMsgstr) {
      entries.push({ msgid: currentMsgid, msgstr: currentMsgstr });
    }
    currentMsgid = "";
    currentMsgstr = "";
    readingMsgid = false;
    readingMsgstr = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("#")) continue;

    // Empty line = entry boundary
    if (trimmed === "") {
      if (!isHeader) flushEntry();
      isHeader = false;
      continue;
    }

    if (trimmed.startsWith("msgid ")) {
      if (!isHeader) flushEntry();
      isHeader = false;
      readingMsgid = true;
      readingMsgstr = false;
      currentMsgid = extractQuotedString(trimmed.slice(6));
    } else if (trimmed.startsWith("msgstr ")) {
      readingMsgid = false;
      readingMsgstr = true;
      currentMsgstr = extractQuotedString(trimmed.slice(7));
    } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      // Continuation line
      const val = extractQuotedString(trimmed);
      if (readingMsgid) {
        currentMsgid += val;
      } else if (readingMsgstr) {
        currentMsgstr += val;
      }
    }
  }

  // Flush last entry
  flushEntry();

  return entries;
}

function extractQuotedString(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Categorize translations into sections
// ---------------------------------------------------------------------------

// Map msgid -> { section, key }
type SectionKey = { section: string; key: string };

function categorize(msgid: string): SectionKey {
  // Navigation items
  const navKeys: Record<string, string> = {
    Dashboard: "dashboard",
    Map: "map",
    Gallery: "gallery",
    Admin: "admin",
    Logout: "logout",
    Dogs: "dogs",
    "Add a Dog": "addDog",
    "Street Dog App": "appName",
  };
  if (msgid in navKeys) return { section: "nav", key: navKeys[msgid] };

  // Auth section
  const authPatterns: [RegExp | string, string][] = [
    ["Sign In", "signIn"],
    ["Sign in", "signInLower"],
    ["Sign up", "signUp"],
    ["Create Account", "createAccount"],
    ["Reset Password", "resetPassword"],
    ["Set New Password", "setNewPassword"],
    ["Forgot password?", "forgotPassword"],
    ["Don't have an account?", "noAccount"],
    ["Already have an account?", "hasAccount"],
    ["Back to login", "backToLogin"],
    ["Help track and care for street dogs", "tagline"],
    ["Invalid email or password", "invalidCredentials"],
    ["Your account has been banned. Please contact support.", "accountBanned"],
    [/^Welcome back/, "welcomeBack"],
    [/^Congratulations, you are now registered/, "registered"],
    ["You have been logged out.", "loggedOut"],
    ["Check your email for instructions to reset your password.", "checkEmail"],
    ["Your password has been reset.", "passwordReset"],
    [/^Enter your email address/, "resetInstructions"],
  ];
  for (const [pat, key] of authPatterns) {
    if (typeof pat === "string" ? msgid === pat : pat.test(msgid))
      return { section: "auth", key };
  }

  // Dashboard section
  const dashKeys: Record<string, string> = {
    "Your Score": "yourScore",
    "New Dogs": "newDogs",
    pts: "pts",
    "Unique Dogs": "uniqueDogs",
    "Total Catches": "totalCatches",
    "TOTAL SCORE": "totalScore",
    "Waiting to Sync": "waitingToSync",
    "First Caught": "firstCaught",
    "My Catches": "myCatches",
    Favorites: "favorites",
    "Find Them All": "findThemAll",
    "Find this Dog!": "findThisDog",
    "No dogs found in this category yet.": "noDogs",
  };
  if (msgid in dashKeys) return { section: "dashboard", key: dashKeys[msgid] };

  // Dog caught / add dog
  const addDogKeys: Record<string, string> = {
    "Congratulations!": "congratulations",
    "Great Job!": "greatJob",
    "Points!": "points",
    "Name This Dog": "nameThisDog",
    "View Profile": "viewProfile",
    "Back to Dashboard": "backToDashboard",
    "Add Another Name": "addAnotherName",
    "Current name(s):": "currentNames",
    Skip: "skip",
  };
  if (msgid in addDogKeys) return { section: "addDog", key: addDogKeys[msgid] };
  if (/^Dog named/.test(msgid)) return { section: "addDog", key: "dogNamed" };

  // Dog profile
  const profileKeys: Record<string, string> = {
    "Adopt Info": "adoptInfo",
    "Health Concern": "healthConcern",
    Unfavorite: "unfavorite",
    Favorite: "favorite",
    Report: "report",
    "First discovered by:": "firstDiscoveredBy",
    Unknown: "unknown",
    "Ear Tag ID:": "earTagId",
    "Character:": "character",
    "Size:": "size",
    "Gender:": "gender",
    "Age:": "age",
    "Total Sightings:": "totalSightings",
    "Last seen:": "lastSeen",
    "Location History": "locationHistory",
    Last: "last",
    sightings: "sightings",
    "Recent Sightings": "recentSightings",
    "No sightings yet": "noSightings",
  };
  if (msgid in profileKeys)
    return { section: "dogProfile", key: profileKeys[msgid] };

  // Gallery
  const galleryKeys: Record<string, string> = {
    "Dog Gallery": "title",
    "No dogs with photos yet. Be the first to catch one!": "noPhotos",
  };
  if (msgid in galleryKeys)
    return { section: "gallery", key: galleryKeys[msgid] };

  // Map (no specific map strings in .po yet)

  // Report
  const reportKeys: Record<string, string> = {
    "Submit Report": "submitReport",
    "Reporting about:": "reportingAbout",
    "ID:": "id",
    Cancel: "cancel",
    "Report submitted successfully. Thank you!": "submitted",
  };
  if (msgid in reportKeys)
    return { section: "report", key: reportKeys[msgid] };

  // Adopt
  const adoptKeys: Record<string, string> = {
    "Adoption Information": "title",
    "How to Adopt a Street Dog": "howToAdopt",
    "Find a Dog": "findDog",
    "Contact Us": "contactUs",
    "Reach out to our adoption coordinator:": "reachOut",
  };
  if (msgid in adoptKeys) return { section: "adopt", key: adoptKeys[msgid] };
  if (/^Thank you for your interest in adopting/.test(msgid))
    return { section: "adopt", key: "thankYou" };
  if (/^Browse the dog catalog/.test(msgid))
    return { section: "adopt", key: "browseCatalog" };

  // Admin section
  const adminKeys: Record<string, string> = {
    "Admin Dashboard": "dashboard",
    "Total Users": "totalUsers",
    "Total Dogs": "totalDogs",
    "Total Sightings": "totalSightings",
    "Pending Reports": "pendingReports",
    "Most Active Users": "mostActiveUsers",
    User: "user",
    Email: "email",
    "OCR Used": "ocrUsed",
    "Dogs Added": "dogsAdded",
    Reports: "reports",
    "Last Activity": "lastActivity",
    "Manage Users": "manageUsers",
    "Manage Dogs": "manageDogs",
    "View, edit, ban/unban users": "manageUsersDesc",
    "View, edit, delete dog entries": "manageDogsDesc",
    "View Sightings": "viewSightings",
    "Review all dog sightings": "viewSightingsDesc",
    "Manage user reports": "manageReportsDesc",
    Settings: "settings",
    "Configure system settings": "settingsDesc",
    "User Reports": "userReports",
    All: "all",
    Open: "open",
    "In Progress": "inProgress",
    Resolved: "resolved",
    "System Settings": "systemSettings",
    "All Sightings": "allSightings",
    Nickname: "nickname",
    Role: "role",
    Status: "status",
    Created: "created",
    Search: "search",
    Image: "image",
    "Name(s)": "names",
    "Ear Tag ID": "earTagId",
    Character: "character",
    Sightings: "sightings",
    "Last Seen": "lastSeen",
    Actions: "actions",
    "Edit Dog": "editDog",
    "Edit Sighting": "editSighting",
    "Edit User": "editUser",
    "You need administrator privileges to access this page.":
      "adminRequired",
    "Settings updated successfully!": "settingsUpdated",
    "Dog updated successfully!": "dogUpdated",
    "Dog deleted successfully!": "dogDeleted",
    "User updated successfully!": "userUpdated",
    "You cannot ban yourself!": "cannotBanSelf",
    "You cannot delete yourself!": "cannotDeleteSelf",
    "User deleted successfully!": "userDeleted",
    "Sighting updated successfully!": "sightingUpdated",
    "Sighting deleted successfully!": "sightingDeleted",
    "Report status updated!": "reportStatusUpdated",
  };
  if (msgid in adminKeys) return { section: "admin", key: adminKeys[msgid] };
  if (/^User .+ has been banned/.test(msgid))
    return { section: "admin", key: "userBanned" };
  if (/^User .+ has been unbanned/.test(msgid))
    return { section: "admin", key: "userUnbanned" };
  if (/^Dogs merged/.test(msgid))
    return { section: "admin", key: "dogsMerged" };

  // Fallback: common
  return { section: "common", key: slugify(msgid) };
}

function slugify(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60)
    .replace(/_+$/, "");
}

// ---------------------------------------------------------------------------
// Build structured JSON
// ---------------------------------------------------------------------------

function buildJson(entries: PoEntry[]): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {
    nav: {},
    dashboard: {},
    addDog: {},
    dogProfile: {},
    map: {},
    gallery: {},
    auth: {},
    admin: {},
    adopt: {},
    report: {},
    common: {},
  };

  for (const { msgid, msgstr } of entries) {
    if (!msgid) continue;

    const { section, key } = categorize(msgid);
    if (!result[section]) result[section] = {};

    // Convert Python format %(name)s to ICU format {name}
    const value = msgstr.replace(/%\((\w+)\)s/g, "{$1}");
    result[section][key] = value;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("=".repeat(60));
  console.log("Street Dog App — Translation Conversion (.po -> JSON)");
  console.log("=".repeat(60));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const locale of LOCALES) {
    const poPath = path.join(PO_BASE, locale, "LC_MESSAGES", "messages.po");

    if (!fs.existsSync(poPath)) {
      console.error(`  [${locale}] File not found: ${poPath}`);
      continue;
    }

    console.log(`  [${locale}] Reading ${poPath}`);
    const content = fs.readFileSync(poPath, "utf-8");
    const entries = parsePo(content);
    console.log(`  [${locale}] Parsed ${entries.length} translation entries`);

    const json = buildJson(entries);

    // Count per section
    for (const [section, keys] of Object.entries(json)) {
      const count = Object.keys(keys).length;
      if (count > 0) console.log(`    ${section}: ${count} keys`);
    }

    const outPath = path.join(OUTPUT_DIR, `${locale}.json`);
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2) + "\n", "utf-8");
    console.log(`  [${locale}] Written to ${outPath}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Translation conversion complete!");
  console.log("=".repeat(60));
}

main();
