import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { getInvite, getPickLists } from "@/lib/members/pick-lists";
import { getStaff } from "@/lib/admin/staff";
import { RegistrationSteps } from "@/components/join/registration-steps";

export const metadata: Metadata = { title: "Register", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ invite?: string }> };

export default async function StepsPage({ searchParams }: Props) {
  const { invite } = await searchParams;
  const member = await getMember();
  if (!member) redirect("/join");
  if (member.registered) redirect("/app");

  const [lists, staff, inviteInfo] = await Promise.all([getPickLists(), getStaff(), getInvite(invite)]);
  if (!lists.registrationOpen && !staff?.isAdmin && !inviteInfo?.tester) redirect("/join");

  return (
    <div className="section pb-16 pt-10 lg:pt-14">
      <Link href="/join" className="font-semibold text-tea underline underline-offset-4">
        About joining
      </Link>
      <h1 className="mt-4 text-4xl font-bold">Register</h1>
      <div className="mt-8">
        <RegistrationSteps
          lists={lists}
          defaultName={member.fullName ?? member.nameFromSignIn}
          email={member.email}
          storageKey={`mhs-join-${member.userId}`}
          invite={inviteInfo}
          adminTesting={!lists.registrationOpen && !inviteInfo?.tester}
        />
      </div>
    </div>
  );
}
