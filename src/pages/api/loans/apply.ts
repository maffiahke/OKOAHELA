import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { withApi, ok, requireUser, ApiError } from "@/lib/api";
import { applyForLoan, discardUnpaidApplication } from "@/lib/loans/service";
import { toMoney } from "@/lib/loans/engine";
import { initiateStkPush } from "@/lib/mpesa/service";

// POST /api/loans/apply — create the application and charge the displayed
// application fee via M-Pesa STK. Once the fee settles (settle.ts) the
// application moves AWAITING_PAYMENT → PENDING for manual admin review.
export default withApi(async (req: NextApiRequest, res: NextApiResponse) => {
  const user = await requireUser(req);
  if (req.method !== "POST") throw new ApiError(405, "Method not allowed");

  const body = z
    .object({
      productId: z.string().min(1, "Select a loan product"),
      periodMonths: z.number().int().min(1).max(24),
      mpesaNumber: z.string().min(9),
      idNumber: z.string().trim().regex(/^\d{7,8}$/, "Enter a valid National ID number"),
      gender: z.enum(["MALE", "FEMALE"]),
      maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "COHABITING"]),
      county: z.string().trim().min(2, "Select your county").max(40),
      loanPurpose: z.string().trim().min(2, "Tell us the loan purpose").max(120),
      nextOfKinName: z.string().trim().min(3, "Enter next of kin full name").max(80),
      nextOfKinPhone: z
        .string()
        .trim()
        .regex(/^(?:\+?254|0)(7|1)\d{8}$/, "Enter a valid next of kin phone number"),
      nextOfKinRelationship: z.string().trim().min(2).max(30),
    })
    .parse(req.body);

  // Normalise next-of-kin phone to the 2547XXXXXXXX storage format.
  const nokPhone = (() => {
    let digits = body.nextOfKinPhone.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = `254${digits.slice(1)}`;
    else if (digits.startsWith("254")) digits = digits;
    else digits = `254${digits}`;
    return digits;
  })();

  const application = await applyForLoan({
    userId: user.id,
    productId: body.productId,
    periodMonths: body.periodMonths,
    mpesaNumber: body.mpesaNumber,
    idNumber: body.idNumber,
    gender: body.gender,
    maritalStatus: body.maritalStatus,
    county: body.county,
    loanPurpose: body.loanPurpose,
    nextOfKinName: body.nextOfKinName,
    nextOfKinPhone: nokPhone,
    nextOfKinRelationship: body.nextOfKinRelationship,
  });

  const fee = toMoney(application.fee);
  let checkoutRequestId: string;
  try {
    const stk = await initiateStkPush({
      phone: application.mpesaNumber,
      amount: fee,
      purpose: "LOAN_APPLICATION_FEE",
      relatedType: "LoanApplication",
      relatedId: application.id,
      description: "Loan application fee",
    });
    checkoutRequestId = stk.checkoutRequestId;
  } catch (err) {
    // Could not charge the fee → don't leave a stranded application behind.
    await discardUnpaidApplication(application.id);
    throw err;
  }

  ok(
    res,
    {
      id: application.id,
      reference: application.reference,
      amount: toMoney(application.amount),
      fee,
      totalRepayment: toMoney(application.totalRepayment),
      monthlyRepayment: toMoney(application.monthlyRepayment),
      periodMonths: application.periodMonths,
      status: application.status,
      checkoutRequestId,
    },
    201,
  );
});
