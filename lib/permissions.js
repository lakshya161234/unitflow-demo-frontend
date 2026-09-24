/**
 * Frontend permission helpers.
 *
 * The backend currently guarantees `roles` in /auth/me, while some older payloads
 * may also include direct permission keys. We support both.
 */

const CAP = {
  ADMIN: "ADMIN_ACCESS",
  CLIENTS_VIEW: "CLIENTS_VIEW",
  CLIENTS_MANAGE: "CLIENTS_MANAGE",
  FACTORIES_VIEW: "FACTORIES_VIEW",
  FACTORIES_MANAGE: "FACTORIES_MANAGE",
  CATALOG_VIEW: "CATALOG_VIEW",
  CATALOG_MANAGE: "CATALOG_MANAGE",
  ORDERS_VIEW: "ORDERS_VIEW",
  ORDERS_MANAGE: "ORDERS_MANAGE",
  INVOICES_VIEW: "INVOICES_VIEW",
  INVOICES_MANAGE: "INVOICES_MANAGE",
  PAYMENTS_VIEW: "PAYMENTS_VIEW",
  PAYMENTS_MANAGE: "PAYMENTS_MANAGE",
  PRODUCTION_VIEW: "PRODUCTION_VIEW",
  PRODUCTION_MANAGE: "PRODUCTION_MANAGE",
  INVENTORY_VIEW: "INVENTORY_VIEW",
  INVENTORY_MANAGE: "INVENTORY_MANAGE",
  PURCHASES_VIEW: "PURCHASES_VIEW",
  PURCHASES_MANAGE: "PURCHASES_MANAGE",
  MESSAGING_USE: "MESSAGING_USE",
  STATS_VIEW: "STATS_VIEW",
};

const ROLE_CAPS = {
  ADMIN: Object.values(CAP),
  MANAGER: [
    CAP.CLIENTS_VIEW,
    CAP.CLIENTS_MANAGE,
    CAP.FACTORIES_VIEW,
    CAP.CATALOG_VIEW,
    CAP.CATALOG_MANAGE,
    CAP.ORDERS_VIEW,
    CAP.ORDERS_MANAGE,
    CAP.INVOICES_VIEW,
    CAP.INVOICES_MANAGE,
    CAP.PAYMENTS_VIEW,
    CAP.PAYMENTS_MANAGE,
    CAP.PRODUCTION_VIEW,
    CAP.PRODUCTION_MANAGE,
    CAP.INVENTORY_VIEW,
    CAP.INVENTORY_MANAGE,
    CAP.PURCHASES_VIEW,
    CAP.PURCHASES_MANAGE,
    CAP.MESSAGING_USE,
    CAP.STATS_VIEW,
  ],
  STAFF: [
    CAP.CATALOG_VIEW,
    CAP.ORDERS_VIEW,
    CAP.ORDERS_MANAGE,
    CAP.INVOICES_VIEW,
    CAP.PAYMENTS_VIEW,
    CAP.PAYMENTS_MANAGE,
    CAP.PRODUCTION_VIEW,
    CAP.PRODUCTION_MANAGE,
    CAP.INVENTORY_VIEW,
    CAP.INVENTORY_MANAGE,
    CAP.PURCHASES_VIEW,
    CAP.PURCHASES_MANAGE,
  ],
  SALES: [
    CAP.CLIENTS_VIEW,
    CAP.CLIENTS_MANAGE,
    CAP.CATALOG_VIEW,
    CAP.CATALOG_MANAGE,
    CAP.ORDERS_VIEW,
    CAP.ORDERS_MANAGE,
    CAP.INVOICES_VIEW,
    CAP.MESSAGING_USE,
  ],
  FINANCE: [
    CAP.CLIENTS_VIEW,
    CAP.INVOICES_VIEW,
    CAP.INVOICES_MANAGE,
    CAP.PAYMENTS_VIEW,
    CAP.PAYMENTS_MANAGE,
    CAP.STATS_VIEW,
    CAP.MESSAGING_USE,
  ],
  INVENTORY: [CAP.CATALOG_VIEW, CAP.INVENTORY_VIEW, CAP.INVENTORY_MANAGE, CAP.PURCHASES_VIEW],
  PRODUCTION: [CAP.PRODUCTION_VIEW, CAP.PRODUCTION_MANAGE, CAP.INVENTORY_VIEW],
  PROCUREMENT: [CAP.PURCHASES_VIEW, CAP.PURCHASES_MANAGE, CAP.INVENTORY_VIEW],
  MESSAGING: [CAP.MESSAGING_USE],
};

export function normalizeRoleName(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function extractPermissionKeys(me) {
  if (!me) return null;
  if (Array.isArray(me.permissions)) return me.permissions.filter(Boolean);
  if (Array.isArray(me.permission_keys)) return me.permission_keys.filter(Boolean);
  if (Array.isArray(me.perms)) return me.perms.filter(Boolean);
  return null;
}

export function extractRoleNames(me) {
  if (!me) return [];
  return (Array.isArray(me.roles) ? me.roles : [])
    .map((role) => {
      if (typeof role === "string") return role;
      return role?.name || role?.role_name || role?.key || "";
    })
    .filter(Boolean);
}

export function buildPermissionSet(me) {
  const keys = extractPermissionKeys(me);
  if (!keys) return null;
  return new Set(keys);
}

function capabilitiesForRoles(roleNames) {
  const caps = new Set();
  (Array.isArray(roleNames) ? roleNames : [])
    .map(normalizeRoleName)
    .forEach((role) => {
      const roleCaps = ROLE_CAPS[role];
      if (Array.isArray(roleCaps)) roleCaps.forEach((cap) => caps.add(cap));
    });
  return caps;
}

function requiredCapsFromPermissionKey(key) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return new Set();

  if (normalizedKey.startsWith("im.")) {
    return new Set([CAP.MESSAGING_USE]);
  }

  if (normalizedKey.startsWith("admin.")) {
    return new Set([CAP.ADMIN]);
  }

  const parts = normalizedKey.split(".");
  const mod = (parts[0] || "").toLowerCase();
  const action = (parts[1] || "").toLowerCase();

  const isView =
    action === "view" ||
    action === "list" ||
    action === "get" ||
    action === "me" ||
    normalizedKey.endsWith(".view") ||
    normalizedKey.includes(".view.") ||
    normalizedKey.includes(".pdf.view");

  const isManage = !isView;

  switch (mod) {
    case "clients":
    case "client_contacts":
    case "client_products":
      return new Set([isManage ? CAP.CLIENTS_MANAGE : CAP.CLIENTS_VIEW]);
    case "factories":
      return new Set([isManage ? CAP.FACTORIES_MANAGE : CAP.FACTORIES_VIEW]);
    case "categories":
    case "products":
      return new Set([isManage ? CAP.CATALOG_MANAGE : CAP.CATALOG_VIEW]);
    case "orders":
      return new Set([isManage ? CAP.ORDERS_MANAGE : CAP.ORDERS_VIEW]);
    case "invoices":
      return new Set([isManage ? CAP.INVOICES_MANAGE : CAP.INVOICES_VIEW]);
    case "payments":
      return new Set([isManage ? CAP.PAYMENTS_MANAGE : CAP.PAYMENTS_VIEW]);
    case "production":
      return new Set([isManage ? CAP.PRODUCTION_MANAGE : CAP.PRODUCTION_VIEW]);
    case "inventory":
      return new Set([isManage ? CAP.INVENTORY_MANAGE : CAP.INVENTORY_VIEW]);
    case "purchases":
      return new Set([isManage ? CAP.PURCHASES_MANAGE : CAP.PURCHASES_VIEW]);
    case "messages":
      return new Set([CAP.MESSAGING_USE]);
    case "stats":
      return new Set([CAP.STATS_VIEW]);
    case "permissions":
      return new Set([CAP.ADMIN]);
    default:
      return new Set();
  }
}

function hasAnyRequiredCapability(userCaps, requiredCaps) {
  if (!requiredCaps || requiredCaps.size === 0) return false;
  for (const cap of requiredCaps) {
    if (userCaps.has(cap)) return true;
  }
  return false;
}

export function canAccess({ user, permissionSet }, key) {
  if (!key) return true;
  if (user?.is_admin) return true;

  if (permissionSet instanceof Set) {
    if (permissionSet.has(key)) return true;
  }

  const roleNames = extractRoleNames(user);
  if (roleNames.length > 0) {
    const userCaps = capabilitiesForRoles(roleNames);
    const requiredCaps = requiredCapsFromPermissionKey(key);
    if (requiredCaps.size > 0) return hasAnyRequiredCapability(userCaps, requiredCaps);

    if (String(key).startsWith("im.")) return true;
  }

  if (permissionSet === null) {
    return String(key).startsWith("im.");
  }

  return false;
}
