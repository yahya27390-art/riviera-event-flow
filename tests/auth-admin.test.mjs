import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const input = (await fs.readFile(new URL('../supabase/functions/accounting-users/index.ts',import.meta.url),'utf8'))
  .replace(/import \{ createClient \} from '[^']+';/,'const createClient = () => globalThis.edgeTestService;');
const code=ts.transpileModule(input,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
let moduleId=0;
async function setup(user,accounts=[]){
 const updates=[],creations=[],tables=[];
 globalThis.edgeTestService={auth:{
   getUser:async token=>({data:{user:token==='valid'?user:null},error:null}),
   admin:{listUsers:async()=>({data:{users:accounts},error:null}),
     updateUserById:async(id,payload)=>{updates.push({id,payload});return {error:null};},
     createUser:async payload=>{creations.push(payload);return {data:{user:{id:'new-user'}},error:null};}},
 },from:table=>{tables.push(table);const query={select:()=>query,eq:()=>query,
   maybeSingle:async()=>({data:{id:'legacy-user'},error:null})};return query;}};
 let handler;
 globalThis.Deno={env:{get:key=>key==='SUPABASE_URL'?'https://local.invalid':'test-only'},serve:fn=>{handler=fn;}};
 await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')+'#'+(++moduleId));
 const call=body=>handler(new Request('https://local.invalid',{method:'POST',headers:{Authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {call,updates,creations,tables};
}
const admin={id:'admin',email:'admin@example.test',app_metadata:{accounting_access:true,role:'admin'},user_metadata:{}};

test('account management rejects a forged browser role or unapproved user',async()=>{
 const api=await setup({id:'fake',app_metadata:{},user_metadata:{role:'admin'}});
 assert.equal((await api.call({action:'create',role:'admin',email:'new@example.test',tempPasscode:'longpassword'})).status,401);
 assert.equal(api.creations.length,0);assert.equal(api.tables.length,0);
});
test('accountants cannot create administrators or reset staff passwords',async()=>{
 const api=await setup({...admin,app_metadata:{accounting_access:true,role:'accountant'}});
 assert.equal((await api.call({action:'reset',email:'staff@example.test'})).status,403);
 assert.equal(api.updates.length,0);
});
test('admin creates a forced-change account without modifying financial tables',async()=>{
 const api=await setup(admin);
 assert.equal((await api.call({action:'create',email:'new@example.test',role:'accountant',tempPasscode:'safe-temporary-password',mustChange:false})).status,200);
 assert.equal(api.creations[0].app_metadata.must_change_password,true);
 assert.deepEqual(api.tables,['users']);
});
test('password change is central, affects only authenticated account and enforces minimum length',async()=>{
 const api=await setup({...admin,id:'staff',app_metadata:{accounting_access:true,role:'accountant',must_change_password:true}});
 assert.equal((await api.call({action:'change-password',password:'1234'})).status,400);
 assert.equal(api.updates.length,0);
 assert.equal((await api.call({action:'change-password',password:'new-secure-password'})).status,200);
 assert.equal(api.updates[0].id,'staff');assert.equal(api.updates[0].payload.app_metadata.must_change_password,false);
 assert.equal(api.tables.length,0);
});
test('disabling staff preserves all application records and revokes accounting access',async()=>{
 const staff={...admin,id:'staff',email:'staff@example.test'};
 const api=await setup(admin,[staff]);
 assert.equal((await api.call({action:'disable',email:staff.email})).status,200);
 assert.equal(api.updates[0].payload.app_metadata.accounting_access,false);
 assert.equal(api.updates[0].payload.app_metadata.disabled,true);
 assert.equal(api.tables.length,0);
});
test('admin cannot disable their own account',async()=>{
 const api=await setup(admin,[admin]);
 assert.equal((await api.call({action:'disable',email:admin.email})).status,400);
 assert.equal(api.updates.length,0);
});
