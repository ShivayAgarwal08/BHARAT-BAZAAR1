import os,tempfile,unittest
from pathlib import Path
_d=tempfile.TemporaryDirectory();os.environ.update(DATABASE_URL=f"sqlite:///{Path(_d.name)/'growth.db'}",JWT_SECRET="growth-test-secret-at-least-32-bytes",ADMIN_EMAIL="admin@example.com",ADMIN_PASSWORD="AdminPass123!")
from fastapi.testclient import TestClient
from database import engine
from main import app
class GrowthTests(unittest.TestCase):
 @classmethod
 def setUpClass(c): c.client=TestClient(app)
 @classmethod
 def tearDownClass(c): engine.dispose();_d.cleanup()
 def user(self,role,email,**extra):
  r=self.client.post('/auth/signup',json={'name':role,'email':email,'password':'SafePass123!','role':role,**extra});self.assertEqual(r.status_code,200);return r.json()
 def test_growth_pilot_security_and_profiles(self):
  a=self.user('artisan','a@x.com'); i=self.user('intern','i@x.com',bio='Student bio',services='Cataloging'); o=self.user('artisan','o@x.com'); oi=self.user('intern','oi@x.com'); h=lambda x:{'Authorization':'Bearer '+x['access_token']}; ah,ih,oh,oih=h(a),h(i),h(o),h(oi)
  payload={'title':'Catalog help','description':'Need help','help_type':'cataloging','preferred_duration_months':1}
  self.assertEqual(self.client.post('/growth/requests',json=payload).status_code,401);self.assertEqual(self.client.post('/growth/requests',headers=ih,json=payload).status_code,403)
  r=self.client.post('/growth/requests',headers=ah,json=payload);self.assertEqual(r.status_code,200);q=r.json();self.assertEqual(q['artisan_id'],a['user']['id']);self.assertEqual(q['status'],'pending')
  admin=self.client.post('/auth/login',json={'email':'admin@example.com','password':'AdminPass123!'}).json();ad=h(admin);self.assertEqual(self.client.get('/growth/requests',headers=ad).status_code,200)
  self.assertEqual(self.client.post(f"/growth/requests/{q['id']}/start-pilot",headers=ad).status_code,400);self.assertEqual(self.client.post(f"/growth/requests/{q['id']}/assign?student_id={a['user']['id']}",headers=ad).status_code,400)
  m=self.client.post(f"/growth/requests/{q['id']}/assign?student_id={i['user']['id']}",headers=ad);self.assertEqual(m.status_code,200);self.assertEqual(m.json()['status'],'matched')
  p=self.client.post(f"/growth/requests/{q['id']}/start-pilot",headers=ad);self.assertEqual(p.status_code,200);self.assertEqual(p.json()['funding_type'],'PLATFORM_SPONSORED');self.assertEqual(p.json()['artisan_cost'],0);self.assertEqual(self.client.post(f"/growth/requests/{q['id']}/start-pilot",headers=ad).status_code,409)
  ap=self.client.get('/growth/pilots/mine',headers=ah).json()[0];ip=self.client.get('/growth/pilots/mine',headers=ih).json()[0];self.assertEqual(ap['student_name'],'intern');self.assertEqual(ip['artisan_name'],'artisan');self.assertEqual(ap['request_title'],'Catalog help');self.assertEqual(self.client.get('/growth/pilots/mine',headers=oh).json(),[]);self.assertEqual(self.client.get('/growth/pilots/mine',headers=oih).json(),[])
if __name__=='__main__': unittest.main()
