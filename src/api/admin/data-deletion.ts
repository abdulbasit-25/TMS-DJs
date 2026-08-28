import mongoose from "mongoose";
import { connectDb } from "../../lib/db";
import { getSessionUserFromRequest, requireRole } from "../../lib/auth";
import { jsonResponse, parseJson } from "../../lib/api";
import { recordAudit } from "../../lib/audit";
import { AccessRequest } from "../../models/accessRequest";
import { ApprovalRequest } from "../../models/approvalRequest";
import { AuditLog } from "../../models/auditLog";
import { Carrier } from "../../models/carrier";
import { Commission } from "../../models/commission";
import { Customer } from "../../models/customer";
import { DailyActivityLog } from "../../models/dailyActivityLog";
import {
  OnboardingDocument,
  OnboardingRequirement,
  OnboardingReview,
} from "../../models/onboarding";
import { Document as PortalDocument } from "../../models/document";
import { ExportLog } from "../../models/exportLog";
import { FollowUp } from "../../models/followUp";
import { Invoice } from "../../models/invoice";
import { Lead } from "../../models/lead";
import { Load } from "../../models/load";
import { LoginHistory } from "../../models/loginHistory";
import { Notification } from "../../models/notification";
import { QuoteRequest } from "../../models/quoteRequest";
import { ReassignmentHistory } from "../../models/reassignmentHistory";
import { Team } from "../../models/team";
import { TrainingModule } from "../../models/trainingModule";
import { User } from "../../models/user";

type Resource =
  | "notifications"
  | "leads"
  | "customers"
  | "followups"
  | "invoices"
  | "loads"
  | "quotes"
  | "approvals"
  | "teams"
  | "carriers"
  | "commissions"
  | "activityLogs"
  | "auditLogs"
  | "loginHistory"
  | "sessionLogs"
  | "users";

type CollectionTarget = {
  name: Resource;
  model: {
    countDocuments: () => Promise<number>;
    deleteMany: (filter: Record<string, unknown>) => Promise<{ deletedCount?: number }>;
  };
};

const RESOURCE_MODELS: CollectionTarget[] = [
  { name: "notifications", model: Notification },
  { name: "leads", model: Lead },
  { name: "customers", model: Customer },
  { name: "followups", model: FollowUp },
  { name: "invoices", model: Invoice },
  { name: "loads", model: Load },
  { name: "quotes", model: QuoteRequest },
  { name: "approvals", model: ApprovalRequest },
  { name: "teams", model: Team },
  { name: "carriers", model: Carrier },
  { name: "commissions", model: Commission },
  { name: "activityLogs", model: DailyActivityLog },
  { name: "auditLogs", model: AuditLog },
  { name: "loginHistory", model: LoginHistory },
];

const EXTRA_MODELS = [
  AccessRequest,
  PortalDocument,
  OnboardingDocument,
  OnboardingRequirement,
  OnboardingReview,
  ExportLog,
  ReassignmentHistory,
  TrainingModule,
];

const ADMIN_ONLY_ACTIONS = new Set(["delete_everything_except_admins"]);

async function requireAdmin(request: Request) {
  return requireRole(await getSessionUserFromRequest(request), ["admin"]);
}

async function getCounts() {
  const counts: Record<string, number> = {};
  await Promise.all(
    RESOURCE_MODELS.map(async ({ name, model }) => {
      counts[name] = await model.countDocuments();
    }),
  );
  counts.users = await User.countDocuments();
  counts.adminUsers = await User.countDocuments({ role: "admin" });
  counts.deletableUsers = counts.users - counts.adminUsers;
  return counts;
}

async function deleteResource(resource: Resource) {
  if (resource === "users") {
    const result = await User.deleteMany({ role: { $ne: "admin" } });
    return {
      deletedCount: result.deletedCount ?? 0,
      protectedCount: await User.countDocuments({ role: "admin" }),
    };
  }

  if (resource === "carriers") {
    const result = await Carrier.updateMany(
      { deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date() } },
    );
    return { deletedCount: result.modifiedCount ?? 0 };
  }

  const target = RESOURCE_MODELS.find((entry) => entry.name === resource);
  if (!target) throw Object.assign(new Error("Unsupported deletion resource"), { status: 400 });
  const result = await target.model.deleteMany({});
  return { deletedCount: result.deletedCount ?? 0 };
}

async function deleteEverythingExceptAdmins() {
  const deleted: Record<string, number> = {};
  for (const resource of RESOURCE_MODELS) {
    const result = await deleteResource(resource.name);
    deleted[resource.name] = result.deletedCount;
  }
  for (const model of EXTRA_MODELS) {
    const result = await model.deleteMany({});
    deleted[model.modelName] = result.deletedCount ?? 0;
  }
  const userResult = await deleteResource("users");
  deleted.users = userResult.deletedCount;
  return { deleted, protected: { users: userResult.protectedCount } };
}

export async function dataDeletionHandler(request: Request) {
  const sessionUser = await requireAdmin(request);
  await connectDb();

  if (request.method === "GET") {
    return jsonResponse({ counts: await getCounts() });
  }

  if (request.method !== "POST") {
    throw Object.assign(new Error("Method not allowed"), { status: 405 });
  }

  const body = await parseJson(request);
  const action = typeof body.action === "string" ? body.action : "";
  const resource = body.resource as Resource;
  const expectedConfirmation = ADMIN_ONLY_ACTIONS.has(action)
    ? "DELETE EVERYTHING"
    : resource === "users"
      ? "DELETE ALL USERS"
      : "DELETE";
  if (body.confirmation !== expectedConfirmation) {
    throw Object.assign(new Error(`Type ${expectedConfirmation} to confirm`), { status: 400 });
  }

  let result: Record<string, unknown>;
  if (action === "delete_resource") {
    if (![...RESOURCE_MODELS.map(({ name }) => name), "users"].includes(resource)) {
      throw Object.assign(new Error("Unsupported deletion resource"), { status: 400 });
    }
    result = { resource, ...(await deleteResource(resource)) };
  } else if (action === "delete_everything_except_admins") {
    result = await deleteEverythingExceptAdmins();
  } else {
    throw Object.assign(new Error("Unknown deletion action"), { status: 400 });
  }

  await recordAudit({
    actorId: sessionUser.id,
    actionType:
      action === "delete_resource"
        ? `bulk_delete_${resource}`
        : "bulk_delete_everything_except_admins",
    targetType: "data_deletion",
    metadata: { ...result, success: true, timestamp: new Date().toISOString() },
  });

  return jsonResponse({ success: true, ...result });
}
