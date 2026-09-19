import os
import shutil
import tempfile
import unittest


class AdminFoundationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.mkdtemp(prefix="bharat-bazaar-admin-")
        cls.db_path = os.path.join(cls.temp_dir, "admin-tests.db")
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["JWT_SECRET"] = "phase4-isolated-test-secret-with-at-least-32-bytes"
        os.environ["ADMIN_EMAIL"] = "admin@example.test"
        os.environ["ADMIN_PASSWORD"] = "AdminTestPass!234"
        os.environ["GEMINI_API_KEY"] = ""

        from fastapi.testclient import TestClient
        import main
        import models
        from admin_bootstrap import bootstrap_initial_admin
        from database import SessionLocal, engine

        cls.client = TestClient(main.app)
        cls.models = models
        cls.bootstrap_initial_admin = bootstrap_initial_admin
        cls.SessionLocal = SessionLocal
        cls.engine = engine

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()
        shutil.rmtree(cls.temp_dir, ignore_errors=True)

    def signup(self, role):
        response = self.client.post("/auth/signup", json={
            "name": f"{role.title()} Test User",
            "email": f"{role}@example.test",
            "password": "UserTestPass!234",
            "role": role,
            "language": "en",
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_admin_foundation(self):
        db = self.SessionLocal()
        try:
            self.assertEqual(db.query(self.models.User).filter(self.models.User.role == "admin").count(), 1)
        finally:
            db.close()
        type(self).bootstrap_initial_admin()
        db = self.SessionLocal()
        try:
            self.assertEqual(db.query(self.models.User).filter(self.models.User.role == "admin").count(), 1)
        finally:
            db.close()

        public_admin = self.client.post("/auth/signup", json={
            "name": "Public Admin Attempt", "email": "public-admin@example.test",
            "password": "UserTestPass!234", "role": "admin",
        })
        self.assertEqual(public_admin.status_code, 422)

        artisan = self.signup("artisan")
        intern = self.signup("intern")
        admin_login = self.client.post("/auth/login", json={
            "email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"],
        })
        self.assertEqual(admin_login.status_code, 200, admin_login.text)
        admin = admin_login.json()
        admin_headers = {"Authorization": f"Bearer {admin['access_token']}"}
        self.assertEqual(admin["user"]["role"], "admin")
        me = self.client.get("/auth/me", headers=admin_headers)
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["role"], "admin")

        artisan_headers = {"Authorization": f"Bearer {artisan['access_token']}"}
        intern_headers = {"Authorization": f"Bearer {intern['access_token']}"}
        self.assertEqual(self.client.get("/admin/summary").status_code, 401)
        self.assertEqual(self.client.get("/admin/summary", headers=artisan_headers).status_code, 403)
        self.assertEqual(self.client.get("/admin/summary", headers=intern_headers).status_code, 403)

        assisted = self.client.post("/assisted-registration/request", json={
            "full_name": "Queue Test", "phone_number": "+919876543210",
            "preferred_language": "en", "preferred_callback_time": "Weekdays",
        })
        self.assertEqual(assisted.status_code, 201, assisted.text)
        queue = self.client.get("/assisted-registration/requests", headers=admin_headers)
        self.assertEqual(queue.status_code, 200)
        self.assertTrue(any(item["id"] == assisted.json()["id"] for item in queue.json()))
        updated = self.client.patch(
            f"/assisted-registration/requests/{assisted.json()['id']}",
            headers=admin_headers,
            json={"status": "contacted", "notes": "Test note"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["status"], "contacted")

        account_payload = {
            "name": "Queue Test", "email": "assisted-artisan@example.com", "password": "TemporaryPass123!",
            "phone_number": "+919876543210", "location": "Test village", "language": "en",
        }
        create_path = f"/admin/assisted-registrations/{assisted.json()['id']}/create-artisan"
        self.assertEqual(self.client.post(create_path, json=account_payload).status_code, 401)
        self.assertEqual(self.client.post(create_path, headers=artisan_headers, json=account_payload).status_code, 403)
        self.assertEqual(self.client.post(create_path, headers=intern_headers, json=account_payload).status_code, 403)
        invalid_phone = self.client.post(create_path, headers=admin_headers, json={**account_payload, "phone_number": "bad"})
        self.assertEqual(invalid_phone.status_code, 422)
        self.assertEqual(self.client.get("/assisted-registration/requests", headers=admin_headers).json()[0]["status"], "contacted")
        created_artisan = self.client.post(create_path, headers=admin_headers, json=account_payload)
        self.assertEqual(created_artisan.status_code, 201, created_artisan.text)
        self.assertEqual(created_artisan.json()["role"], "artisan")
        self.assertNotIn("password", created_artisan.json())
        self.assertEqual(self.client.post(create_path, headers=admin_headers, json=account_payload).status_code, 409)
        duplicate_request = self.client.post("/assisted-registration/request", json={
            "full_name": "Duplicate Test", "phone_number": "+919876543211", "preferred_language": "en", "preferred_callback_time": "Weekdays",
        }).json()
        duplicate = self.client.post(f"/admin/assisted-registrations/{duplicate_request['id']}/create-artisan", headers=admin_headers, json=account_payload)
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(self.client.get("/assisted-registration/requests", headers=admin_headers).json()[0]["status"], "pending")
        artisan_login = self.client.post("/auth/login", json={"email": account_payload["email"], "password": account_payload["password"]})
        self.assertEqual(artisan_login.status_code, 200)
        created_headers = {"Authorization": f"Bearer {artisan_login.json()['access_token']}"}
        self.assertEqual(self.client.get("/auth/me", headers=created_headers).json()["role"], "artisan")
        self.assertEqual(self.client.get("/admin/summary", headers=created_headers).status_code, 403)
        self.assertEqual(self.client.post("/admin/assisted-registrations/999999/create-artisan", headers=admin_headers, json={**account_payload, "email": "new@example.com"}).status_code, 404)

        artisans = self.client.get("/admin/artisans", headers=admin_headers)
        interns = self.client.get("/admin/interns", headers=admin_headers)
        summary = self.client.get("/admin/summary", headers=admin_headers)
        self.assertEqual(artisans.status_code, 200)
        self.assertEqual(interns.status_code, 200)
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(artisans.json()[0]["role"], "artisan")
        self.assertEqual(interns.json()[0]["role"], "intern")
        self.assertEqual(summary.json()["total_artisans"], 2)
        self.assertEqual(summary.json()["total_interns"], 1)
        self.assertEqual(summary.json()["pending_assisted_registrations"], 1)


if __name__ == "__main__":
    unittest.main()
