import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCause, getChannelForCause, getReceipt } from "@/lib/data";
import { formatKes } from "@/lib/money";
import { isReference } from "@/lib/references";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

type Params = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const periodUnit: Record<string, string> = { monthly: "months", quarterly: "quarters", annual: "years" };

const periodText: Record<string, string> = {
  monthly: "every month",
  quarterly: "every 3 months",
  annually: "every year",
  annual: "every year",
};

export default async function ThankYouPage({ params, searchParams }: Params) {
  const { reference } = await params;
  const t = (await searchParams).t;
  const token = Array.isArray(t) ? t[0] : t;
  if (!isReference(reference) || !token || !/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const receipt = await getReceipt(reference, token);
  if (!receipt) notFound();
  const cause = await getCause(receipt.causeSlug);
  if (!cause) notFound();
  const channel = await getChannelForCause(cause);

  let summary: string;
  if (receipt.kind === "donation") {
    const freq = receipt.frequency ?? "once";
    summary = `${formatKes(receipt.amount ?? 0)}${freq === "once" ? "" : ` ${periodText[freq]}`}`;
  } else {
    const type = receipt.pledgeType ?? "one_time";
    summary =
      type === "in_kind"
        ? `In kind: ${receipt.inKindDescription}`
        : type === "one_time"
          ? formatKes(receipt.totalAmount ?? 0)
          : `${formatKes(receipt.amountPerPeriod ?? 0)} ${periodText[type]} for ${receipt.numberOfPeriods} ${periodUnit[type]}, ${formatKes(receipt.totalAmount ?? 0)} in total`;
  }
  const email = receipt.email ?? "your email";

  const joinHref = `/join?from=donation&ref=${encodeURIComponent(reference)}`;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-12">
      <h1 className="text-4xl font-bold">Thank you, {receipt.firstName}</h1>
      <p className="mt-3 text-lg text-ink-soft">
        {receipt.kind === "pledge" ? "Your pledge" : "Your gift"} to {cause.title.toLowerCase()} is recorded.
        {receipt.kind === "pledge" && receipt.isFounding && " It counts as a founding pledge."}
      </p>

      <section className="mt-8 rounded-lg border border-line bg-surface p-6">
        <p className="text-ink-soft">Your reference</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-wide sm:text-4xl">{reference}</p>
        <p className="mt-4">{summary}</p>
        <p className="mt-1 text-[0.95rem] text-ink-soft">A confirmation will be sent to {email}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">How to pay</h2>
        {channel.paybillNumber ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>On M-Pesa, choose Lipa na M-Pesa, then Pay Bill.</li>
            <li>
              Business number: <strong>{channel.paybillNumber}</strong>
            </li>
            <li>
              Account number: <strong>{reference}</strong>
            </li>
          </ol>
        ) : (
          <div className="mt-4 rounded-lg bg-gold-tint p-5">
            <p>
              The Paybill for this cause is being confirmed. We will send it to {email} with your reference. When
              you pay, enter <strong>{reference}</strong> as the account number so your payment is matched to you.
            </p>
          </div>
        )}
        <p className="mt-4 text-[0.95rem]">Money is paid into: {channel.accountDisplayName}.</p>
        <p className="mt-2 text-[0.95rem] font-semibold">
          Never send money to a personal phone number, whoever asks.
        </p>
      </section>

      <section className="mt-12 border-l-4 border-gold pl-6">
        <h2 className="text-2xl font-bold">Would you like to join the association?</h2>
        <p className="mt-3 text-ink-soft">
          Membership puts you on the register, connects you with your class and region, and keeps you updated. We will
          use the details you just gave, so it only takes a moment.
        </p>
        <Link href={joinHref} className={`${buttonClass("primary")} mt-5`}>
          Join the association
        </Link>
      </section>
    </div>
  );
}
