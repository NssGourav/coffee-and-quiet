import { z } from "zod";
import { withDb } from "@/lib/db";
import { readInput, requireStaff, errorResponse, HttpError } from "@/lib/http";
import { analyseEnquiry, draftReply, categories } from "@/lib/enquiry-ai";
const input = z.object({
  version: z.number().int().positive(),
  action: z.enum(["analyse", "save", "send"]),
  message: z.string().trim().min(8).max(3000).optional(),
  category: z.enum(categories).optional(),
  complaint: z.boolean().optional(),
  draft: z.string().trim().min(10).max(5000).optional(),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const data = await readInput(request, input);
    const user = await requireStaff();
    const id = z.uuid().parse((await params).id);
    const enquiry = await withDb(
      user.id,
      async (db) =>
        (await db.query("select * from resort.enquiries where id=$1", [id]))
          .rows[0],
    );
    if (!enquiry) throw new HttpError(404, "Enquiry not found.");
    if (enquiry.version !== data.version)
      throw new HttpError(
        409,
        "This enquiry changed. Reload before continuing.",
      );
    let action: string = data.action,
      change: object = data;
    if (action === "save" && (!data.message || !data.category))
      throw new HttpError(400, "Message and category are required.");
    if (action === "send" && !data.draft)
      throw new HttpError(400, "Review the reply before sending.");
    if (action === "analyse") {
      try {
        const extraction = await analyseEnquiry(enquiry.message);
        const category =
          enquiry.gm_alert || extraction.category === "complaint"
            ? "complaint"
            : enquiry.manual_route
              ? enquiry.category
              : extraction.category;
        change = { category, complaint: category === "complaint" };
        const draft = await draftReply(category);
        change = {
          category,
          extraction,
          draft,
          note: "AI suggestion. Check the original and all facts before approving. Dates are preserved as written; no price or availability has been promised.",
        };
        action = "ai";
      } catch {
        action = "failure";
      }
    }
    await withDb(user.id, (db) =>
      db.query("select resort.change_enquiry($1,$2,$3,$4)", [
        id,
        data.version,
        action,
        JSON.stringify(change),
      ]),
    );
    return Response.json({ ok: true, manual: action === "failure" });
  } catch (e) {
    return errorResponse(e);
  }
}
