-- 프로필 테이블에 가입자 정보 필드 추가
alter table profiles add column if not exists email text;
alter table profiles add column if not exists gender text; -- 'male' | 'female' | 'other' | 'prefer_not_to_say'
alter table profiles add column if not exists age_range text; -- '10s' | '20s' | '30s' | '40s' | '50s+'
alter table profiles add column if not exists signup_source text; -- 'email' | 'google' | 'kakao'
alter table profiles add column if not exists profile_completed_at timestamptz;

-- 가입자 정보 한눈에 보기 위한 뷰 (관리자용)
create or replace view admin_signups as
select
  p.id,
  p.email,
  p.display_name,
  p.gender,
  p.age_range,
  p.signup_source,
  p.created_at as signup_at,
  p.profile_completed_at,
  (select count(*) from clothes where user_id = p.id) as clothes_count,
  (select count(*) from wear_log where user_id = p.id) as wear_log_count,
  (select max(worn_on) from wear_log where user_id = p.id) as last_active
from profiles p
order by p.created_at desc;
