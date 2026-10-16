-- M6: "exited" becomes "terminated" (product owner, 16 Oct 2026). Own file: enum changes commit first.
alter type public.membership_status rename value 'exited' to 'terminated';
