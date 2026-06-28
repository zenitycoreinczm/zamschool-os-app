CREATE OR REPLACE FUNCTION public.record_student_payment_transaction(
  p_school_id uuid,
  p_student_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_payment_method text,
  p_reference_number text,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
declare
  v_fee record;
  v_remaining numeric := coalesce(p_amount, 0);
  v_apply numeric;
  v_new_paid numeric;
  v_new_status text;
  v_paid_at timestamp with time zone;
  v_payment public.payments%rowtype;
  v_applied_fee_ids uuid[] := '{}'::uuid[];
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_student_id
      and school_id = p_school_id
      and lower(coalesce(role, '')) = 'student'
  ) then
    raise exception 'Student not found or access denied';
  end if;

  for v_fee in
    select *
    from public.student_fees
    where school_id = p_school_id
      and student_id = p_student_id
      and status = any (array['PENDING', 'PARTIAL'])
    order by due_date asc, created_at asc, id asc
    for update
  loop
    exit when v_remaining <= 0;

    v_apply := least(
      v_remaining,
      greatest(coalesce(v_fee.amount_due, 0) - coalesce(v_fee.amount_paid, 0), 0)
    );

    if v_apply <= 0 then
      continue;
    end if;

    v_new_paid := coalesce(v_fee.amount_paid, 0) + v_apply;
    v_new_status := case
      when v_new_paid >= coalesce(v_fee.amount_due, 0) then 'PAID'
      else 'PARTIAL'
    end;
    v_paid_at := case
      when v_new_status = 'PAID' then now()
      else v_fee.paid_at
    end;

    update public.student_fees
    set amount_paid = v_new_paid,
        status = v_new_status,
        paid_at = v_paid_at,
        updated_at = now()
    where id = v_fee.id
      and school_id = p_school_id;

    v_applied_fee_ids := array_append(v_applied_fee_ids, v_fee.id);
    v_remaining := v_remaining - v_apply;
  end loop;

  insert into public.payments (
    student_id,
    school_id,
    amount,
    currency,
    payment_type,
    payment_method,
    reference_number,
    status,
    paid_at,
    created_by
  )
  values (
    p_student_id,
    p_school_id,
    p_amount,
    'ZMW',
    p_payment_type,
    p_payment_method,
    p_reference_number,
    'PAID',
    now(),
    p_created_by
  )
  returning * into v_payment;

  return jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'remaining_amount', v_remaining,
    'applied_fee_ids', to_jsonb(v_applied_fee_ids)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_student_fee_payment_transaction(
  p_school_id uuid,
  p_student_fee_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_number text,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
declare
  v_student_fee public.student_fees%rowtype;
  v_updated_fee public.student_fees%rowtype;
  v_payment public.payments%rowtype;
  v_current_paid numeric;
  v_amount_due numeric;
  v_new_amount_paid numeric;
  v_new_status text;
  v_paid_at timestamp with time zone;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  select *
  into v_student_fee
  from public.student_fees
  where id = p_student_fee_id
    and school_id = p_school_id
  for update;

  if not found then
    raise exception 'Student fee record not found';
  end if;

  v_current_paid := coalesce(v_student_fee.amount_paid, 0);
  v_amount_due := coalesce(v_student_fee.amount_due, 0);
  v_new_amount_paid := v_current_paid + p_amount;
  v_new_status := case
    when v_new_amount_paid >= v_amount_due then 'PAID'
    when v_new_amount_paid > 0 then 'PARTIAL'
    else 'PENDING'
  end;
  v_paid_at := case
    when v_new_status = 'PAID' then now()
    else v_student_fee.paid_at
  end;

  update public.student_fees
  set amount_paid = v_new_amount_paid,
      status = v_new_status,
      paid_at = v_paid_at,
      updated_at = now()
  where id = p_student_fee_id
    and school_id = p_school_id
  returning * into v_updated_fee;

  insert into public.payments (
    school_id,
    student_id,
    amount,
    currency,
    payment_type,
    payment_method,
    reference_number,
    status,
    paid_at,
    created_by
  )
  values (
    p_school_id,
    v_student_fee.student_id,
    p_amount,
    'ZMW',
    'tuition',
    p_payment_method,
    p_reference_number,
    'PAID',
    now(),
    p_created_by
  )
  returning * into v_payment;

  return jsonb_build_object(
    'student_fee', to_jsonb(v_updated_fee),
    'payment', to_jsonb(v_payment),
    'previous_status', v_student_fee.status,
    'new_status', v_updated_fee.status,
    'previous_amount_paid', v_current_paid,
    'new_amount_paid', v_updated_fee.amount_paid
  );
end;
$function$;

REVOKE ALL ON FUNCTION public.record_student_payment_transaction(uuid, uuid, numeric, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_student_fee_payment_transaction(uuid, uuid, numeric, text, text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_student_payment_transaction(uuid, uuid, numeric, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_student_fee_payment_transaction(uuid, uuid, numeric, text, text, uuid) TO service_role;
