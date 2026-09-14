-- LMS onboarding/document workflow
grant select, insert, update on table public.lms_onboarding_consents to service_role;
grant select, insert, update on table public.lms_learner_documents to service_role;

create or replace function public.has_completed_lms_onboarding(p_consent_version text default '2026-08-23')
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lms_onboarding_consents c
    where c.user_id = auth.uid()
      and c.consent_version = p_consent_version
      and c.accepted_terms is true
      and c.accepted_refund_policy is true
      and c.accepted_disclaimer is true
      and c.accepted_mock_requirements is true
  );
$$;
revoke all on function public.has_completed_lms_onboarding(text) from public, anon;
grant execute on function public.has_completed_lms_onboarding(text) to authenticated;
