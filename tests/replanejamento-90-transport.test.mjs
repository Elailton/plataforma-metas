import { test } from 'node:test'
import {spawnSync} from 'node:child_process'
import assert from 'node:assert/strict'
test('transporte do lote respeita Retry-After e não repete gravação quando o resultado é incerto',()=>{
 const code=`
import sys,io,json,os,urllib.error
from unittest.mock import patch
from email.message import Message
sys.path.insert(0,'ops/replanejamento-90');import aplicar
headers=Message();headers['Retry-After']='2'
e=urllib.error.HTTPError('https://api.supabase.com',429,'rate',headers,io.BytesIO(b'limited'))
with patch.dict(os.environ,{'SUPABASE_ACCESS_TOKEN':'placeholder'}),patch.object(aplicar.urllib.request,'urlopen',side_effect=[e,io.BytesIO(b'[]')]) as net,patch.object(aplicar.time,'sleep') as sleep,patch.object(aplicar.time,'monotonic',return_value=100):
 aplicar._last_request=0
 assert aplicar.query('select 1')==[]
 assert net.call_count==2
 assert any(x.args==(2.0,) for x in sleep.call_args_list)
e=urllib.error.HTTPError('https://api.supabase.com',503,'uncertain',Message(),io.BytesIO(b'unknown outcome'))
with patch.dict(os.environ,{'SUPABASE_ACCESS_TOKEN':'placeholder'}),patch.object(aplicar.urllib.request,'urlopen',side_effect=e) as net,patch.object(aplicar.time,'sleep'):
 try:aplicar.query('a write that may have committed')
 except RuntimeError as error:assert '503' in str(error)
 else:raise AssertionError('must stop on uncertain result')
 assert net.call_count==1
`
 const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stderr)
})
