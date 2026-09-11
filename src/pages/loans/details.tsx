import useSWR from "swr";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Banknote,
  Check,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import Input from "@/components/ui/Input";
import MpesaStkModal from "@/components/mpesa/MpesaStkModal";
import ProductBadge from "@/components/loans/ProductBadge";
import { formatKES } from "@/utils/format";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";

interface LoanProduct {
  id: string;
  name: string;
  amount: number;
  feeRate: number;
  flatFee: number;
  fee: number;
  periodMonths: number;
  description: string;
  badge: string | null;
  minSavings: number;
  locked: boolean;
}

interface LoanProductsResponse {
  savingsBalance: number;
  loanLimit: number;
  products: LoanProduct[];
}

const KEY_INFO = [
  "Disbursed via M-Pesa",
  "Automatic repayment reminders",
  "Flexible repayment options",
];

const COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos",
  "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a",
  "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
  "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi", "Trans Nzoia",
  "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
];

const PURPOSES = [
  "Business growth",
  "Agriculture / Farming",
  "School fees",
  "Medical emergency",
  "Home improvement",
  "Transport / Vehicle",
  "Wedding / Funeral",
  "Emergency expenses",
  "Other",
];

const MARITAL_STATUSES = ["Single", "Married", "Cohabiting", "Divorced", "Widowed"];
const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Child", "Relative", "Friend", "Neighbour"];

const GENDER_MAP: Record<string, "MALE" | "FEMALE"> = { Male: "MALE", Female: "FEMALE" };
const MARITAL_MAP: Record<string, string> = {
  Single: "SINGLE",
  Married: "MARRIED",
  Cohabiting: "COHABITING",
  Divorced: "DIVORCED",
  Widowed: "WIDOWED",
};

interface ApplyForm {
  idNumber: string;
  gender: string;
  maritalStatus: string;
  county: string;
  loanPurpose: string;
  nokName: string;
  nokPhone: string;
  nokRelationship: string;
}

const EMPTY_APPLY_FORM: ApplyForm = {
  idNumber: "",
  gender: "",
  maritalStatus: "",
  county: "",
  loanPurpose: "",
  nokName: "",
  nokPhone: "",
  nokRelationship: "",
};

const selectCls =
  "w-full rounded-2xl border-2 border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand";

export default function LoanDetails() {
  const router = useRouter();
  const { show } = useToast();
  const productId = String(router.query.productId ?? "");
  const { data: productsData, error } = useSWR<LoanProductsResponse>(
    productId ? "/api/loan-products" : null,
    api.get,
  );
  const products = productsData?.products;
  const { data: me } = useSWR<{ id: string; phone: string; nationalId?: string | null } | null>(
    "/api/auth/me",
    api.get,
  );

  const product = useMemo(
    () => products?.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const [period, setPeriod] = useState<number | null>(null);
  const [periodSheet, setPeriodSheet] = useState(false);
  const [formSheet, setFormSheet] = useState(false);
  const [applyForm, setApplyForm] = useState<ApplyForm>(EMPTY_APPLY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Fee STK in flight: { checkoutRequestId, applicationId, fee }
  const [stk, setStk] = useState<{ checkoutRequestId: string; applicationId: string; fee: number } | null>(null);
  const [paidApplicationId, setPaidApplicationId] = useState<string | null>(null);

  const effectivePeriod = period ?? product?.periodMonths ?? 1;
  // Flat fee (e.g. KES 70 on the starter loan) replaces the percentage fee.
  const fee = product ? (product.flatFee > 0 ? product.flatFee : product.fee) : 0;
  const total = (product?.amount ?? 0) + fee;
  const monthly = Math.round(Math.floor((total / effectivePeriod) * 100) / 100);
  const locked = product?.locked ?? false;
  const unlockShortfall = product ? Math.max(0, product.minSavings - (productsData?.savingsBalance ?? 0)) : 0;

  const af = <K extends keyof ApplyForm>(key: K, value: ApplyForm[K]) =>
    setApplyForm((prev) => ({ ...prev, [key]: value }));

  const openApplyForm = () => {
    setApplyForm({ ...EMPTY_APPLY_FORM, idNumber: me?.nationalId ?? "" });
    setFormError(null);
    setFormSheet(true);
  };

  const validateApplyForm = (): string | null => {
    if (!/^\d{7,8}$/.test(applyForm.idNumber)) return "Enter a valid National ID number";
    if (!applyForm.gender) return "Select your gender";
    if (!applyForm.maritalStatus) return "Select your marital status";
    if (!applyForm.county) return "Select your county";
    if (!applyForm.loanPurpose) return "Select the loan purpose";
    if (applyForm.nokName.trim().length < 3) return "Enter next of kin full name";
    if (!/^(?:\+?254|0)(7|1)\d{8}$/.test(applyForm.nokPhone.replace(/\s/g, "")))
      return "Enter a valid next of kin phone number";
    if (!applyForm.nokRelationship) return "Select next of kin relationship";
    return null;
  };

  const submitApplyForm = () => {
    const err = validateApplyForm();
    if (err) {
      setFormError(err);
      return;
    }
    setFormSheet(false);
    setAgree(false);
    setConfirmOpen(true);
  };

  const submit = async () => {
    if (!product) return;
    setSubmitting(true);
    try {
      const app = await api.post<{
        id: string;
        status: string;
        fee: number;
        checkoutRequestId: string;
      }>("/api/loans/apply", {
        productId: product.id,
        periodMonths: effectivePeriod,
        mpesaNumber: me?.phone ?? "254700000000",
        idNumber: applyForm.idNumber,
        gender: GENDER_MAP[applyForm.gender] ?? "MALE",
        maritalStatus: MARITAL_MAP[applyForm.maritalStatus] ?? "SINGLE",
        county: applyForm.county,
        loanPurpose:
          applyForm.loanPurpose === "Other"
            ? "Other"
            : applyForm.loanPurpose,
        nextOfKinName: applyForm.nokName.trim(),
        nextOfKinPhone: applyForm.nokPhone.replace(/\s/g, ""),
        nextOfKinRelationship: applyForm.nokRelationship,
      });
      setConfirmOpen(false);
      // Charge the application fee via M-Pesa STK before the review queue.
      setPaidApplicationId(null);
      setStk({ checkoutRequestId: app.checkoutRequestId, applicationId: app.id, fee: app.fee });
    } catch (e) {
      show(e instanceof Error ? e.message : "Could not submit application", "error");
      setSubmitting(false);
    }
  };

  const finishStk = (success: boolean) => {
    const applicationId = paidApplicationId;
    setStk(null);
    setSubmitting(false);
    if (success && applicationId) {
      router.push(
        `/loans/processing?applicationId=${applicationId}&amount=${product?.amount ?? 0}&status=PENDING`,
      );
    }
  };

  if (error || (products && !product)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-gray-500">Loan product not found.</p>
        <button
          onClick={() => router.push("/loans")}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white"
        >
          Back to products
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  const rows: { label: string; value: string; periodPicker?: boolean }[] = [
    { label: "Loan Amount", value: formatKES(product.amount) },
    { label: "Fee", value: formatKES(fee) },
    { label: "Total Repayment", value: formatKES(total) },
    { label: "Repayment Period", value: `${effectivePeriod} ${effectivePeriod === 1 ? "Month" : "Months"}`, periodPicker: true },
    { label: "Monthly Repayment", value: formatKES(monthly) },
  ];

  return (
    <div className="flex flex-col px-5 pb-6 pt-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/loans")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-gray-50"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight text-ink">Loan Details</h1>
      </div>

      {/* Selected amount hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 flex flex-col items-center rounded-3xl bg-brand-gradient p-7 text-center shadow-brand"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          <Banknote size={28} className="text-white" />
        </div>
        <p className="mt-4 text-3xl font-extrabold tracking-tight text-white">
          {formatKES(product.amount)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand-dark">
            Selected Amount
          </span>
          {product.badge && <ProductBadge label={product.badge} />}
        </div>
      </motion.div>

      {/* Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mt-5 rounded-3xl bg-white p-2 shadow-card"
      >
        {rows.map((r) => (
          <button
            key={r.label}
            onClick={r.periodPicker ? () => setPeriodSheet(true) : undefined}
            className={`flex w-full items-center justify-between px-3 py-3.5 ${
              r.periodPicker ? "transition hover:bg-gray-50" : "cursor-default"
            }`}
          >
            <span className="text-sm font-medium text-gray-500">{r.label}</span>
            <span className="flex items-center gap-1 text-sm font-extrabold text-ink">
              {r.value}
              {r.periodPicker && <ChevronRight size={16} className="text-gray-300" />}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Key information */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-5"
      >
        <p className="text-sm font-extrabold text-brand">Key Information</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {KEY_INFO.map((k) => (
            <li key={k} className="flex items-center gap-2.5 text-[13px] font-medium text-gray-600">
              <CheckCircle2 size={17} className="shrink-0 text-brand" />
              {k}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Locked requirement notice */}
      {locked && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-center gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Lock size={18} className="text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-amber-700">Locked — savings requirement not met</p>
            <p className="mt-0.5 text-xs font-medium text-amber-600">
              {unlockShortfall > 0
                ? `Save ${formatKES(product.minSavings)} to unlock this loan amount.`
                : "Your savings don't cover this loan's requirement yet."}
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex-1" />

      {locked ? (
        <button
          onClick={() => router.push("/savings")}
          className="mt-6 rounded-2xl bg-amber-500 py-4 text-base font-bold text-white shadow-brand transition hover:bg-amber-600 active:scale-[0.98]"
        >
          Save to unlock
        </button>
      ) : (
        <button
          onClick={openApplyForm}
          className="mt-6 rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
        >
          Continue
        </button>
      )}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
        By continuing, you agree to our <span className="font-semibold text-gray-500">Terms &amp; Conditions</span> and{" "}
        <span className="font-semibold text-gray-500">Privacy Policy</span>
      </p>

      {/* Loan application form sheet */}
      <Sheet open={formSheet} onClose={() => setFormSheet(false)} title="Loan Application Form">
        <p className="-mt-2 mb-4 text-center text-xs font-semibold text-gray-400">
          Tell us a bit about yourself — this helps us approve your loan faster.
        </p>

        <label className="block text-xs font-bold text-gray-500">NATIONAL ID NUMBER</label>
        <Input
          inputMode="numeric"
          placeholder="e.g. 12345678"
          value={applyForm.idNumber}
          onChange={(e) => af("idNumber", e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="mt-1.5"
        />

        <label className="mt-4 block text-xs font-bold text-gray-500">GENDER</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {["Male", "Female"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => af("gender", g)}
              className={`rounded-2xl border-2 py-2.5 text-sm font-bold transition ${
                applyForm.gender === g
                  ? "border-brand bg-brand-soft text-brand-dark"
                  : "border-gray-100 bg-white text-gray-500 hover:border-brand/30"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-bold text-gray-500">MARITAL STATUS</label>
        <select
          value={applyForm.maritalStatus}
          onChange={(e) => af("maritalStatus", e.target.value)}
          className={`mt-1.5 ${selectCls}`}
        >
          <option value="">Select marital status</option>
          {MARITAL_STATUSES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-bold text-gray-500">COUNTY</label>
        <select
          value={applyForm.county}
          onChange={(e) => af("county", e.target.value)}
          className={`mt-1.5 ${selectCls}`}
        >
          <option value="">Select county</option>
          {COUNTIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-bold text-gray-500">LOAN PURPOSE</label>
        <select
          value={applyForm.loanPurpose}
          onChange={(e) => af("loanPurpose", e.target.value)}
          className={`mt-1.5 ${selectCls}`}
        >
          <option value="">What will you use the loan for?</option>
          {PURPOSES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <p className="mt-5 text-sm font-extrabold text-ink">Next of Kin</p>
        <label className="mt-2 block text-xs font-bold text-gray-500">FULL NAME</label>
        <Input
          placeholder="e.g. Jane Wanjiku"
          value={applyForm.nokName}
          onChange={(e) => af("nokName", e.target.value)}
          className="mt-1.5"
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500">PHONE</label>
            <Input
              inputMode="tel"
              placeholder="07XX XXX XXX"
              value={applyForm.nokPhone}
              onChange={(e) => af("nokPhone", e.target.value.replace(/[^\d+]/g, ""))}
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500">RELATIONSHIP</label>
            <select
              value={applyForm.nokRelationship}
              onChange={(e) => af("nokRelationship", e.target.value)}
              className={`mt-1.5 ${selectCls}`}
            >
              <option value="">Select</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {formError && (
          <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500">
            {formError}
          </p>
        )}

        <button
          onClick={submitApplyForm}
          className="mt-4 w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98]"
        >
          Continue
        </button>
      </Sheet>

      {/* Repayment Period sheet (mockup #16) */}
      <Sheet open={periodSheet} onClose={() => setPeriodSheet(false)} title="Repayment Period">
        <div className="flex flex-col gap-2 pb-2">
          {[1, 2, 3, 4].map((m) => (
            <button
              key={m}
              onClick={() => setPeriod(m)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition ${
                effectivePeriod === m
                  ? "border-brand bg-brand-soft"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="text-sm font-bold text-ink">
                {m} {m === 1 ? "Month" : "Months"}
              </span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  effectivePeriod === m ? "border-brand bg-brand" : "border-gray-300"
                }`}
              >
                {effectivePeriod === m && <Check size={12} className="text-white" />}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setPeriodSheet(false)}
          className="mt-3 w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-brand"
        >
          Next
        </button>
      </Sheet>

      {/* Confirm Loan Application modal (mockup #14) */}
      <Sheet open={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title="Confirm Loan Application">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Loan Amount", value: formatKES(product.amount) },
            { label: "Fee", value: formatKES(fee) },
            { label: "Total Repayment", value: formatKES(total) },
            {
              label: "Repayment Period",
              value: `${effectivePeriod} ${effectivePeriod === 1 ? "Month" : "Months"}`,
            },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-gray-50 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400">{c.label}</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{c.value}</p>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl bg-brand-soft p-3.5">
            <p className="text-[11px] font-semibold text-gray-400">Monthly Repayment</p>
            <p className="mt-1 text-sm font-extrabold text-brand-dark">{formatKES(monthly)}</p>
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-gray-500">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
          />
          <span>
            I agree to the <span className="font-semibold text-brand">Terms &amp; Conditions</span>{" "}
            and <span className="font-semibold text-brand">Privacy Policy</span>
          </span>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3 pb-2">
          <button
            onClick={submit}
            disabled={!agree || submitting}
            className="rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-brand transition hover:bg-mid disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Confirm"}
          </button>
          <button
            onClick={() => setConfirmOpen(false)}
            disabled={submitting}
            className="rounded-2xl border border-gray-200 bg-white py-3.5 text-sm font-bold text-ink transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Sheet>

      {/* Application-fee M-Pesa STK modal */}
      <MpesaStkModal
        open={!!stk}
        checkoutRequestId={stk?.checkoutRequestId ?? null}
        amount={stk?.fee ?? null}
        phone={me?.phone}
        label="loan application fee"
        onDone={() => setPaidApplicationId(stk?.applicationId ?? null)}
        onFailed={() => show("Payment was not completed. Your application was not submitted.", "error")}
        onClose={() => finishStk(!!paidApplicationId)}
      />
    </div>
  );
}
