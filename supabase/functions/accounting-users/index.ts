import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

// Deploy only as part of the Auth cutover described in DEPLOYMENT.md.
// Service credentials exist only in the Edge Function environment.
const cors = { 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = request.headers.get('Authorization')?.replace(/^Bearer /i, '') || '';
    const { data: { user }, error: userError } = await service.auth.getUser(token);
    if (userError || !user || user.app_metadata.accounting_access !== true || user.app_metadata.disabled) {
      return reply({ error: 'غير مصرح' }, 401);
    }
    const body = await request.json();
    if (body.action === 'change-password') {
      if (typeof body.password !== 'string' || body.password.length < 8) return reply({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف' }, 400);
      const { error } = await service.auth.admin.updateUserById(user.id, {
        password: body.password,
        app_metadata: { ...user.app_metadata, must_change_password: false },
      });
      if (error) throw error;
      return reply({ success: true });
    }
    if (user.app_metadata.role !== 'admin' || user.app_metadata.must_change_password) {
      return reply({ error: 'صلاحية المدير مطلوبة' }, 403);
    }
    const accounts = [];
    for (let page = 1; ; page++) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      accounts.push(...data.users);
      if (data.users.length < 200) break;
    }
    if (body.action === 'list') {
      return reply({ users: Object.fromEntries(accounts.filter(account => account.app_metadata.accounting_access === true || account.app_metadata.disabled === true)
        .map(account => [account.email, { id: account.id, email: account.email,
          full_name: account.user_metadata.full_name, role: account.app_metadata.role,
          mustChangePasscode: Boolean(account.app_metadata.must_change_password),
          disabled: Boolean(account.app_metadata.disabled) }])) });
    }
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return reply({ error: 'البريد مطلوب' }, 400);
    const target = accounts.find(account => account.email?.toLowerCase() === email);
    if (body.action === 'create') {
      if (target) return reply({ error: 'الحساب موجود بالفعل؛ استخدم إعادة التعيين' }, 409);
      const password = body.tempPasscode || crypto.randomUUID();
      if (typeof password !== 'string' || password.length < 8) return reply({ error: 'كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف' }, 400);
      if (!['admin', 'accountant'].includes(body.role)) return reply({ error: 'صلاحية غير صالحة' }, 400);
      const { data, error } = await service.auth.admin.createUser({ email, password,
        email_confirm: true, user_metadata: { full_name: body.full_name || email },
        app_metadata: { accounting_access: true, role: body.role, must_change_password: true },
      });
      if (error) throw error;
      // Keep legacy user rows and IDs intact; no financial table is touched.
      const { data: existing, error: lookupError } = await service.from('users').select('id').eq('email', email).maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) {
        const { error: insertError } = await service.from('users').insert({ email, full_name: body.full_name || email, role: body.role });
        if (insertError) throw insertError;
      }
      return reply({ success: true, user: { id: data.user.id, email }, tempPasscode: password });
    }
    if (!target || target.app_metadata.accounting_access !== true) return reply({ error: 'الحساب غير موجود' }, 404);
    if (target.id === user.id) return reply({ error: 'لا يمكن تعطيل حسابك أو إعادة تعيينه من إدارة الموظفين' }, 400);
    if (body.action === 'reset') {
      const password = crypto.randomUUID();
      const { error } = await service.auth.admin.updateUserById(target.id, { password,
        app_metadata: { ...target.app_metadata, must_change_password: true },
      });
      if (error) throw error;
      return reply({ success: true, tempPasscode: password });
    }
    if (body.action === 'disable') {
      const { error } = await service.auth.admin.updateUserById(target.id, { ban_duration: '876000h',
        app_metadata: { ...target.app_metadata, disabled: true, accounting_access: false },
      });
      if (error) throw error;
      return reply({ success: true });
    }
    return reply({ error: 'عملية غير صالحة' }, 400);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : 'تعذر تنفيذ العملية' }, 400);
  }
});
