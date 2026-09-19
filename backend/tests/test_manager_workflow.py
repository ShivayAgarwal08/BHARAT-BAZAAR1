import os
import tempfile
import unittest
from pathlib import Path

_temp_dir = tempfile.TemporaryDirectory()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_temp_dir.name) / 'manager-flow.db'}"
os.environ["JWT_SECRET"] = "manager-workflow-isolated-test-secret-with-at-least-32-bytes"
os.environ["ADMIN_EMAIL"] = ""
os.environ["ADMIN_PASSWORD"] = ""

from fastapi.testclient import TestClient
from database import engine
from main import app


class ManagerWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        engine.dispose()
        _temp_dir.cleanup()

    def signup(self, role, email):
        response = self.client.post("/auth/signup", json={
            "name": f"{role} test", "email": email, "password": "SafeTestPass123!",
            "role": role, "language": "en", "phone_number": "+919876543210", "location": "Test village",
        })
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        return body["user"], {"Authorization": f"Bearer {body['access_token']}"}

    def test_complete_manager_hire_and_alert_workflow(self):
        artisan, artisan_headers = self.signup("artisan", "workflow-artisan@example.test")
        intern, intern_headers = self.signup("intern", "workflow-intern@example.test")
        _, other_artisan_headers = self.signup("artisan", "workflow-other@example.test")

        product = self.client.post("/product/create", headers=artisan_headers, json={
            "raw_description": "20 handmade clay diyas", "quantity": 20, "language": "en",
            "ai_data": {"title": "Clay diyas", "description": "20 handmade clay diyas", "category": "pottery", "material": "clay", "tags": [], "quantity": 20},
        })
        self.assertEqual(product.status_code, 200, product.text)
        product_id = product.json()["id"]

        request = self.client.post("/manager/request", headers=artisan_headers, json={"product_id": product_id, "description": "Need marketplace help"})
        self.assertEqual(request.status_code, 200, request.text)
        request_id = request.json()["id"]
        self.assertEqual(self.client.get("/manager/requests").status_code, 401)
        self.assertEqual(self.client.get("/manager/requests", headers=artisan_headers).status_code, 403)
        self.assertEqual(self.client.get("/manager/requests", headers=intern_headers).status_code, 200)
        self.assertEqual(self.client.post("/manager/apply", headers=artisan_headers, json={"request_id": request_id}).status_code, 403)

        application = self.client.post("/manager/apply", headers=intern_headers, json={"request_id": request_id, "cover_note": "I can help"})
        self.assertEqual(application.status_code, 200, application.text)
        application_id = application.json()["id"]
        self.assertEqual(self.client.post(f"/manager/select/{application_id}", headers=other_artisan_headers).status_code, 403)
        self.assertEqual(self.client.post(f"/manager/select/{application_id}", headers=artisan_headers).status_code, 200)

        invitation = self.client.post("/manager/hire", headers=artisan_headers, json={"intern_id": intern["id"], "product_id": product_id, "message": "Please join"})
        self.assertEqual(invitation.status_code, 200, invitation.text)
        invitation_id = invitation.json()["id"]
        self.assertEqual(self.client.patch(f"/manager/invitations/{invitation_id}", headers=artisan_headers, json={"status": "accepted"}).status_code, 403)
        accepted = self.client.patch(f"/manager/invitations/{invitation_id}", headers=intern_headers, json={"status": "accepted"})
        self.assertEqual(accepted.status_code, 200, accepted.text)
        self.assertEqual(accepted.json()["status"], "accepted")

        alert = self.client.post("/manager/alerts", headers=intern_headers, json={"artisan_id": artisan["id"], "product_id": product_id, "message": "I sent an update"})
        self.assertEqual(alert.status_code, 200, alert.text)
        artisan_alerts = self.client.get("/manager/alerts", headers=artisan_headers)
        intern_alerts = self.client.get("/manager/alerts", headers=intern_headers)
        self.assertEqual(artisan_alerts.status_code, 200)
        self.assertEqual(intern_alerts.status_code, 200)
        self.assertEqual(artisan_alerts.json()[0]["message"], "I sent an update")
        self.assertEqual(intern_alerts.json()[0]["message"], "I sent an update")


if __name__ == "__main__":
    unittest.main()
