import { connectDb } from "../../lib/db";
import { getSessionUserFromRequest, requireRole } from "../../lib/auth";
import { errorResponse, jsonResponse, parseJson, parseZod } from "../../lib/api";
import { User } from "../../models/user";
import { emitSystemAlert, type SenderContext } from "../../lib/notification";
import { recordAudit } from "../../lib/audit";
import { AccessRequest } from "../../models/accessRequest";
import { ApprovalRequest } from "../../models/approvalRequest";
import { AuditLog } from "../../models/auditLog";
import { Carrier } from "../../models/carrier";
import { Commission } from "../../models/commission";
import { Customer } from "../../models/customer";
import { DailyActivityLog } from "../../models/dailyActivityLog";
import { Document } from "../../models/document";
import { ExportLog } from "../../models/exportLog";
import { FollowUp } from "../../models/followUp";
import { Invoice } from "../../models/invoice";
import { Lead } from "../../models/lead";
import { Load } from "../../models/load";
import { LoginHistory } from "../../models/loginHistory";
import { Notification } from "../../models/notification";
import {
  OnboardingDocument,
  OnboardingRequirement,
  OnboardingReview,
} from "../../models/onboarding";
import { QuoteRequest } from "../../models/quoteRequest";
import { ReassignmentHistory } from "../../models/reassignmentHistory";
import { Team } from "../../models/team";
import { TrainingModule } from "../../models/trainingModule";
import { z } from "zod";

const resetSystemSchema = z.object({
  password: z.string().min(1),
  confirmation: z.string().refine((value) => value === "RESET", {
    message: "Type RESET to confirm",
  }),
});

const RESETTABLE_MODELS = [
  AccessRequest,
  ApprovalRequest,
  AuditLog,
  Carrier,
  Commission,
  Customer,
  DailyActivityLog,
  Document,
  ExportLog,
  FollowUp,
  Invoice,
  Lead,
  Load,
  LoginHistory,
  Notification,
  OnboardingDocument,
  OnboardingRequirement,
  OnboardingReview,
  QuoteRequest,
  ReassignmentHistory,
  Team,
  TrainingModule,
];

export async function resetSystemHandler(request: Request) {
  const user = await getSessionUserFromRequest(request);
  const sessionUser = requireRole(user, ["admin"]);
  const body = await parseJson(request);
  const payload = parseZod(resetSystemSchema, body);

  await connectDb();

  const adminUser = await User.findById(sessionUser.id).exec();
  if (!adminUser) {
    return errorResponse("Admin user not found", 404);
  }

  const validPassword = await adminUser.comparePassword(payload.password);
  if (!validPassword) {
    return errorResponse("Incorrect password", 401);
  }

  const deletedCollections: Record<string, number> = {};
  for (const model of RESETTABLE_MODELS) {
    const result = await model.deleteMany({});
    deletedCollections[model.collection.name] = result.deletedCount ?? 0;
  }

  await recordAudit({
    actorId: sessionUser.id,
    actionType: "system_reset",
    targetType: "data_deletion",
    metadata: { deletedCollections, preservedUsers: await User.countDocuments(), success: true },
  });

  // Emit system alert after reset
  void emitSystemAlert(
    {
      title: "System reset performed",
      message: `Admin ${sessionUser.name} performed a full system reset. All data except user accounts has been deleted.`,
      priority: "critical",
      metadata: { adminId: sessionUser.id, adminName: sessionUser.name },
    },
    {
      userId: sessionUser.id,
      name: sessionUser.name,
      role: sessionUser.role,
      teamId: sessionUser.teamId,
    } as SenderContext,
  );

  return jsonResponse({ message: "System reset complete", deleted: deletedCollections });
}
