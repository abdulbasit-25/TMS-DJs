import { connectDb } from "../../lib/db";
import { getSessionUserFromRequest, requireAuth, requireRole } from "../../lib/auth";
import { jsonResponse, parseJson } from "../../lib/api";
import { PortalSettings } from "../../models/portal-settings";

const DEFAULTS = {
  companyName: "TMS Freight Portal",
  supportEmail: "ops@djfreight.example",
};

type PortalSettingsValues = typeof DEFAULTS;

export async function portalSettingsHandler(request: Request) {
  if (request.method === "PATCH") {
    const user = requireAuth(await getSessionUserFromRequest(request));
    requireRole(user, ["owner", "admin"]);
    const payload = await parseJson(request);
    const companyName = typeof payload.companyName === "string" ? payload.companyName.trim() : "";
    const supportEmail =
      typeof payload.supportEmail === "string" ? payload.supportEmail.trim().toLowerCase() : "";

    if (!companyName) throw new Error("Company name is required");
    if (!/^\S+@\S+\.\S+$/.test(supportEmail)) throw new Error("A valid support email is required");

    await connectDb();
    const settingsResult = await PortalSettings.findOneAndUpdate(
      {},
      { companyName, supportEmail },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
      .lean()
      .exec();
    const settings = (Array.isArray(settingsResult) ? settingsResult[0] : settingsResult) as
      PortalSettingsValues | null | undefined;
    return jsonResponse({
      companyName: settings?.companyName ?? companyName,
      supportEmail: settings?.supportEmail ?? supportEmail,
    });
  }

  await connectDb();
  const settingsResult = await PortalSettings.findOne().lean().exec();
  const settings = (Array.isArray(settingsResult) ? settingsResult[0] : settingsResult) as
    PortalSettingsValues | null | undefined;
  return jsonResponse({
    companyName: settings?.companyName ?? DEFAULTS.companyName,
    supportEmail: settings?.supportEmail ?? DEFAULTS.supportEmail,
  });
}
