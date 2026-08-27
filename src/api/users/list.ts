import { connectDb } from "../../lib/db";
import { getSessionUserFromRequest, requireRole } from "../../lib/auth";
import { jsonResponse } from "../../lib/api";
import { User } from "../../models/user";
import { Team } from "../../models/team";
import mongoose from "mongoose";
import { getDataAccessScope } from "../../lib/access-scope";

export async function usersListHandler(request: Request) {
  const user = await getSessionUserFromRequest(request);
  requireRole(user, ["admin", "ops_manager", "team_manager"]);
  const sessionUser = user!;

  await connectDb();
  const scope = await getDataAccessScope(sessionUser);
  const userFilter = scope.kind === "org" ? {} : { _id: { $in: scope.userIds ?? [] } };
  const teamFilter = scope.kind === "org" ? {} : { _id: { $in: scope.teamIds } };
  const [users, teams] = await Promise.all([
    User.find(userFilter).lean().exec() as Promise<
      Array<{
        _id: mongoose.Types.ObjectId;
        name: string;
        email: string;
        role: string;
        status: string;
        teamId?: mongoose.Types.ObjectId;
        lastLoginAt?: Date;
        createdAt: Date;
      }>
    >,
    Team.find(teamFilter).lean().exec() as Promise<
      Array<{ _id: mongoose.Types.ObjectId; name: string }>
    >,
  ]);

  const teamMap = Object.fromEntries(teams.map((team) => [team._id.toString(), team.name]));

  return jsonResponse({
    users: users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status === "pending_access_request" ? "inactive" : u.status,
      team: u.teamId ? (teamMap[u.teamId.toString()] ?? null) : null,
      commissionPct: 0,
      lastLogin: u.lastLoginAt?.toISOString() ?? u.createdAt.toISOString(),
    })),
  });
}
