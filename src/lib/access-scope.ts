import mongoose from "mongoose";
import { connectDb } from "./db";
import { Team } from "../models/team";
import { can, type Role } from "./roles";

/**
 * Centralized data-access scoping.
 *
 * Scope model enforced server-side before every business query:
 *   Owner / Admin / Ops Manager -> organization scope
 *   Accounting                  -> financial modules only (module-gated), org-wide there
 *   Team Manager / Lead Agent   -> own team (managed or assigned) + self
 *   Agent / Trainee             -> self records only
 *
 * Every list/detail/mutation endpoint derives its Mongo filter through these
 * helpers so records are never fetched org-wide and filtered afterwards.
 */

export const ORG_ROLES: Role[] = ["owner", "admin", "ops_manager"];
export const TEAM_ROLES: Role[] = ["team_manager", "leadagent"];
export const SELF_ROLES: Role[] = ["agent", "trainee"];

/** Roles with an accounting/finance responsibility that legitimately spans the org. */
export const FINANCE_ORG_ROLES: Role[] = [...ORG_ROLES, "accounting"] as Role[];

/** Authoritative approval-workflow definitions (single source of truth). */
export const ROLES_THAT_NEED_APPROVAL: Role[] = ["agent", "trainee"];
export const ROLES_THAT_CAN_APPROVE: Role[] = [
  "owner",
  "admin",
  "ops_manager",
  "team_manager",
  "leadagent",
];

export function doesUserNeedApproval(role: string): boolean {
  return ROLES_THAT_NEED_APPROVAL.includes(role as Role);
}

type SessionUserLike = {
  id: string;
  role: string;
  name: string;
  email: string;
  teamId?: string;
};

function unauthorized(message: string, status: number): Error {
  const error = new Error(message);
  (error as any).status = status;
  return error;
}

export function forbidden(message = "Not authorized"): Error {
  return unauthorized(message, 403);
}

export function toObjectId(value: string): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(value)) {
    throw unauthorized(`Invalid id "${value}"`, 400);
  }
  return new mongoose.Types.ObjectId(value);
}

/** Enforce a frontend-mirroring capability server-side. */
export function requireCapability(
  user: SessionUserLike,
  cap: Parameters<typeof can>[1],
): void {
  if (!can(user.role as Role, cap)) {
    throw forbidden(`Missing permission: ${cap}`);
  }
}

export function isOrgScoped(role: string): boolean {
  return ORG_ROLES.includes(role as Role);
}

export function isTeamScoped(role: string): boolean {
  return TEAM_ROLES.includes(role as Role);
}

export interface DataAccessScope {
  /** "org" sees everything; "team"/"self" are restricted to `userIds`. */
  kind: "org" | "team" | "self";
  /**
   * Concrete user ids visible to the actor for personal-scoped resources.
   * Always includes the actor themselves. Null for org scope.
   */
  userIds: mongoose.Types.ObjectId[] | null;
  /** Teams the actor manages outright (Team Manager) or belongs to (Lead Agent). */
  teamIds: mongoose.Types.ObjectId[];
}

async function memberIdsOfTeams(teamIds: mongoose.Types.ObjectId[]): Promise<mongoose.Types.ObjectId[]> {
  if (!teamIds.length) return [];
  const teams = await Team.find({ _id: { $in: teamIds } })
    .select("memberIds")
    .lean()
    .exec();
  return teams.flatMap((t: any) => ((t.memberIds ?? []) as mongoose.Types.ObjectId[]) ?? []);
}

/**
 * Resolve the concrete access scope for a session user *before* querying
 * business collections. Throws when authentication is missing.
 */
export async function getDataAccessScope(user: SessionUserLike): Promise<DataAccessScope> {
  const selfId = new mongoose.Types.ObjectId(user.id);

  if (isOrgScoped(user.role)) {
    return { kind: "org", userIds: null, teamIds: [] };
  }

  await connectDb();

  let teamIds: mongoose.Types.ObjectId[] = [];

  if (isTeamScoped(user.role)) {
    if (user.role === "team_manager") {
      // Teams this manager runs; fall back to their assigned team only as a member.
      const managed = await Team.find({ managerId: selfId }).select("_id").lean().exec();
      if (managed.length > 0) {
        teamIds = managed.map((t: any) => t._id);
        const memberIds = await memberIdsOfTeams(teamIds);
        return { kind: "team", userIds: dedupe([selfId, ...memberIds]), teamIds };
      }
    }
    if (user.teamId) {
      const teamId = new mongoose.Types.ObjectId(user.teamId);
      const memberIds = await memberIdsOfTeams([teamId]);
      return { kind: "team", userIds: dedupe([selfId, ...memberIds]), teamIds: [teamId] };
    }
  }

  // Agents / trainees / teamless managers / lead agents without a team: self only.
  return { kind: "self", userIds: [selfId], teamIds: [] };
}

function dedupe(ids: mongoose.Types.ObjectId[]): mongoose.Types.ObjectId[] {
  const seen = new Set<string>();
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of ids) {
    const key = id.toString();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(id);
    }
  }
  return out;
}

/** Filter restricting a personal-owner field (agentId/ownerId/assignedTo/createdBy...) to the scope. */
export function scopeOwnerFilter(field: string, scope: DataAccessScope): Record<string, unknown> {
  if (scope.kind === "org") return {};
  const values = scope.userIds ?? [];
  return values.length === 1 ? { [field]: values[0] } : { [field]: { $in: values } };
}

/** True when the actor may see/read a record owned by `ownerUserId`. */
export function scopeIncludesOwner(scope: DataAccessScope, ownerUserId?: string | null): boolean {
  if (scope.kind === "org") return true;
  if (!ownerUserId) return false;
  return (scope.userIds ?? []).some((id) => id.toString() === String(ownerUserId));
}

/**
 * May `actor` assign/persist `newRole` onto somebody?
 * Validates requested *new* state against actor authority — never the target's
 * current role alone.
 */
const ROLE_RANK: Record<string, number> = {
  owner: 0,
  admin: 1,
  ops_manager: 2,
  team_manager: 3,
  leadagent: 3,
  agent: 5,
  trainee: 6,
  accounting: 7,
};

export function canAssignRole(actorRole: string, newRole: string): boolean {
  if (!(actorRole in ROLE_RANK) || !(newRole in ROLE_RANK)) return false;
  const actorRank = ROLE_RANK[actorRole];
  const newRank = ROLE_RANK[newRole];
  if (newRank < actorRank) return false;
  // Explicit guards preserving documented management ladders.
  if (actorRole === "admin" && newRole === "owner") return false;
  if (actorRole === "ops_manager" && ["owner", "admin"].includes(newRole)) return false;
  return true;
}
