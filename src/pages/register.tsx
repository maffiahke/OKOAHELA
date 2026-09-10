import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ChevronLeft,
  Leaf,
  User,
  Phone,
  IdCard,
  CalendarDays,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import Input from "@/components/ui/Input";
import { api } from "@/lib/client/api";
import {
  nameSchema,
  phoneSchema,
  nationalIdSchema,
  dobSchema,
  passwordSchema,
} from "@/lib/validation/schemas";

type Errors = Partial<Record<"fullName" | "phone" | "nationalId" | "dateOfBirth" | "mpesaNumber" | "password" | "form", string>>;

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    nationalId: "",
    dateOfBirth: "",
    mpesaNumber: "",
    password: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): Errors => {
    const errs: Errors = {};
    const name = nameSchema.safeParse(form.fullName);
    if (!name.success) errs.fullName = name.error.issues[0]?.message;
    const phone = phoneSchema.safeParse(form.phone);
    if (!phone.success) errs.phone = phone.error.issues[0]?.message;
    const nid = nationalIdSchema.safeParse(form.nationalId);
    if (!nid.success) errs.nationalId = nid.error.issues[0]?.message;
    const dob = dobSchema.safeParse(form.dateOfBirth);
    if (!dob.success) errs.dateOfBirth = dob.error.issues[0]?.message;
    const mpesa = phoneSchema.safeParse(form.mpesaNumber);
    if (!mpesa.success) errs.mpesaNumber = mpesa.error.issues[0]?.message;
    const pwd = passwordSchema.safeParse(form.password);
    if (!pwd.success) errs.password = pwd.error.issues[0]?.message;
    return errs;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!acceptTerms) {
      setErrors({ form: "Please accept the Terms & Conditions and Privacy Policy" });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const res = await api.post<{
        userId: string;
        phone: string;
        otp?: string;
      }>("/api/auth/register", {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        dateOfBirth: form.dateOfBirth,
        mpesaNumber: form.mpesaNumber.trim(),
        password: form.password,
        acceptTerms: true,
        acceptPrivacy: true,
      });
      const q = new URLSearchParams({ userId: res.userId, phone: res.phone });
      if (res.otp) q.set("otp", res.otp);
      router.push(`/verify?${q.toString()}`);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Registration failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <div className="mx-auto w-full max-w-md px-5 pb-10">
        {/* Top bar */}
        <div className="flex items-center justify-between py-4">
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-card transition hover:bg-gray-50"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand">
            <Leaf size={22} className="text-white" />
          </div>
        </div>

        <div className="mt-2 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Create Account</h1>
          <p className="mt-1 text-sm text-gray-500">Let&apos;s get you started</p>
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
          <Input
            label="Full Name"
            name="fullName"
            placeholder="Enter your full name"
            icon={User}
            value={form.fullName}
            onChange={set("fullName")}
            error={errors.fullName}
            autoComplete="name"
          />
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="+254 712 345 678"
            icon={Phone}
            value={form.phone}
            onChange={set("phone")}
            error={errors.phone}
            autoComplete="tel"
          />
          <Input
            label="National ID Number"
            name="nationalId"
            inputMode="numeric"
            placeholder="e.g. 12345678"
            icon={IdCard}
            value={form.nationalId}
            onChange={set("nationalId")}
            error={errors.nationalId}
          />
          <Input
            label="Date of Birth"
            name="dateOfBirth"
            type="date"
            icon={CalendarDays}
            value={form.dateOfBirth}
            onChange={set("dateOfBirth")}
            error={errors.dateOfBirth}
          />
          <Input
            label="M-Pesa Number"
            name="mpesaNumber"
            type="tel"
            placeholder="e.g. 0712 345 678"
            icon={Smartphone}
            value={form.mpesaNumber}
            onChange={set("mpesaNumber")}
            error={errors.mpesaNumber}
            hint="Loans are disbursed and repaid via this number"
          />
          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            icon={Lock}
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            autoComplete="new-password"
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="flex h-8 w-8 items-center justify-center text-gray-400 transition hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-gray-500">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            />
            <span>
              I agree to the <span className="font-semibold text-brand">Terms &amp; Conditions</span>{" "}
              and <span className="font-semibold text-brand">Privacy Policy</span>
            </span>
          </label>

          {errors.form && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errors.form}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-brand transition hover:bg-mid active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>

          <p className="mt-2 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
