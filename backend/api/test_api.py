"""
Comprehensive API tests for the estimate management system
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.hashers import make_password
import json

from api.models import (
    User, Role, AuthToken, Project, Estimate, WorkCategory, WorkType, 
    WorkPrice, EstimateItem, Status, ProjectAssignment, Client
)


class AuthenticationTestCase(APITestCase):
    """Tests for authentication system"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')
        
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        
        self.foreman = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )

    def test_successful_login(self):
        """Test successful user login"""
        data = {
            'email': 'manager@test.com',
            'password': 'testpass123'
        }
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'manager@test.com')

    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            'email': 'manager@test.com',
            'password': 'wrongpassword'
        }
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_nonexistent_user(self):
        """Test login with nonexistent user"""
        data = {
            'email': 'nonexistent@test.com',
            'password': 'testpass123'
        }
        response = self.client.post('/api/v1/auth/login/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class WorkCategoryTestCase(APITestCase):
    """Tests for work category management"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')
        
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        
        self.foreman = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )
        
        self.manager_token = AuthToken.objects.create(user=self.manager)
        self.foreman_token = AuthToken.objects.create(user=self.foreman)

    def test_manager_can_create_category(self):
        """Test that manager can create work categories"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        data = {'category_name': 'Test Category'}
        response = self.client.post('/api/v1/work-categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkCategory.objects.count(), 1)

    def test_foreman_cannot_create_category(self):
        """Test that foreman cannot create work categories"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.foreman_token.token}')
        
        data = {'category_name': 'Test Category'}
        response = self.client.post('/api/v1/work-categories/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_both_can_list_categories(self):
        """Test that both manager and foreman can list categories"""
        category = WorkCategory.objects.create(category_name='Test Category')
        
        # Test manager access
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        response = self.client.get('/api/v1/work-categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # Test foreman access
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.foreman_token.token}')
        response = self.client.get('/api/v1/work-categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class WorkTypeTestCase(APITestCase):
    """Tests for work type management"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        self.manager_token = AuthToken.objects.create(user=self.manager)
        
        self.category = WorkCategory.objects.create(category_name='Test Category')

    def test_create_work_type_with_prices(self):
        """Test creating work type with prices"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        data = {
            'work_name': 'Test Work',
            'category': self.category.category_id,
            'unit_of_measurement': 'шт'
        }
        response = self.client.post('/api/v1/work-types/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(WorkType.objects.count(), 1)
        self.assertEqual(WorkPrice.objects.count(), 1)
        
        work_type = WorkType.objects.first()
        work_price = WorkPrice.objects.first()
        self.assertEqual(work_price.cost_price, 100.00)
        self.assertEqual(work_price.client_price, 150.00)

    def test_pagination_and_all_parameter(self):
        """Test pagination and 'all' parameter for work types"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        # Create multiple work types
        for i in range(25):
            work_type = WorkType.objects.create(
                work_name=f'Test Work {i}',
                category=self.category,
                unit_of_measurement='шт'
            )
            WorkPrice.objects.create(
                work_type=work_type,
                cost_price=100.00,
                client_price=150.00
            )
        
        # Test paginated response
        response = self.client.get('/api/v1/work-types/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 20)  # Default page size
        
        # Test 'all' parameter
        response = self.client.get('/api/v1/work-types/?all=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 25)  # All items without pagination


class EstimateTestCase(APITestCase):
    """Tests for estimate management"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')
        
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        
        self.foreman = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )
        
        self.manager_token = AuthToken.objects.create(user=self.manager)
        self.foreman_token = AuthToken.objects.create(user=self.foreman)
        
        self.client_obj = Client.objects.create(client_name='Test Client')
        self.project = Project.objects.create(
            project_name='Test Project',
            address='Test Address',
            client=self.client_obj
        )
        self.status = Status.objects.create(status_name='Черновик')

    def test_manager_can_access_all_estimates(self):
        """Test that manager can access all estimates"""
        # Create estimate for foreman
        estimate = Estimate.objects.create(
            estimate_number='TEST-001',
            project=self.project,
            creator=self.foreman,
            foreman=self.foreman,
            status=self.status
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        response = self.client.get('/api/v1/estimates/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_foreman_can_only_access_own_estimates(self):
        """Test that foreman can only access their own estimates"""
        # Create estimate for different foreman
        other_foreman = User.objects.create(
            email='other@test.com',
            full_name='Other Foreman',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )
        
        # Estimate for other foreman
        Estimate.objects.create(
            estimate_number='TEST-001',
            project=self.project,
            creator=other_foreman,
            foreman=other_foreman,
            status=self.status
        )
        
        # Estimate for current foreman
        Estimate.objects.create(
            estimate_number='TEST-002',
            project=self.project,
            creator=self.foreman,
            foreman=self.foreman,
            status=self.status
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.foreman_token.token}')
        response = self.client.get('/api/v1/estimates/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Only own estimate

    def test_estimate_creation_with_foreman_assignment(self):
        """Test estimate creation with foreman assignment"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        data = {
            'estimate_number': 'TEST-003',
            'project': self.project.project_id,
            'foreman': self.foreman.user_id,
            'items': []
        }
        response = self.client.post('/api/v1/estimates/', json.dumps(data), content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        estimate = Estimate.objects.get(estimate_number='TEST-003')
        self.assertEqual(estimate.foreman, self.foreman)


class ProjectAssignmentTestCase(APITestCase):
    """Tests for project assignment functionality"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')
        
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        
        self.foreman = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )
        
        self.manager_token = AuthToken.objects.create(user=self.manager)
        self.foreman_token = AuthToken.objects.create(user=self.foreman)
        
        self.project = Project.objects.create(
            project_name='Test Project',
            address='Test Address'
        )

    def test_manager_can_create_assignment(self):
        """Test that manager can create project assignments"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        data = {
            'user': self.foreman.user_id,
            'project': self.project.project_id
        }
        response = self.client.post('/api/v1/project-assignments/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProjectAssignment.objects.count(), 1)

    def test_foreman_cannot_create_assignment(self):
        """Test that foreman cannot create project assignments"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.foreman_token.token}')
        
        data = {
            'user': self.foreman.user_id,
            'project': self.project.project_id
        }
        response = self.client.post('/api/v1/project-assignments/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SecurityTestCase(APITestCase):
    """Tests for security features"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')
        
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        
        self.foreman1 = User.objects.create(
            email='foreman1@test.com',
            full_name='Test Foreman 1',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )
        
        self.foreman2 = User.objects.create(
            email='foreman2@test.com',
            full_name='Test Foreman 2',
            password_hash=make_password('testpass123'),
            role=self.foreman_role
        )
        
        self.foreman1_token = AuthToken.objects.create(user=self.foreman1)
        self.foreman2_token = AuthToken.objects.create(user=self.foreman2)
        
        self.project = Project.objects.create(project_name='Test Project')
        self.status = Status.objects.create(status_name='Черновик')
        
        # Create estimate for foreman1
        self.estimate = Estimate.objects.create(
            estimate_number='TEST-001',
            project=self.project,
            creator=self.foreman1,
            foreman=self.foreman1,
            status=self.status
        )

    def test_foreman_cannot_access_other_foreman_estimate(self):
        """Test that one foreman cannot access another foreman's estimate"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.foreman2_token.token}')
        
        response = self.client.get(f'/api/v1/estimates/{self.estimate.estimate_id}/')
        # Should return 404 since foreman can't see estimates from other foremen
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        response = self.client.get('/api/v1/estimates/')
        # Can return either 401 or 403 depending on permission class configuration
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_invalid_token_access_denied(self):
        """Test that invalid tokens are rejected"""
        # Use a valid UUID format but non-existent token
        import uuid
        fake_token = str(uuid.uuid4())
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {fake_token}')
        
        response = self.client.get('/api/v1/estimates/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ExcelExportTestCase(APITestCase):
    """Tests for Excel export functionality"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.manager = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass123'),
            role=self.manager_role
        )
        self.manager_token = AuthToken.objects.create(user=self.manager)
        
        self.project = Project.objects.create(project_name='Test Project')
        self.status = Status.objects.create(status_name='Готово')
        self.category = WorkCategory.objects.create(category_name='Test Category')
        
        self.work_type = WorkType.objects.create(
            work_name='Test Work',
            category=self.category,
            unit_of_measurement='шт'
        )
        
        WorkPrice.objects.create(
            work_type=self.work_type,
            cost_price=100.00,
            client_price=150.00
        )
        
        self.estimate = Estimate.objects.create(
            estimate_number='TEST-001',
            project=self.project,
            creator=self.manager,
            foreman=self.manager,
            status=self.status
        )
        
        EstimateItem.objects.create(
            estimate=self.estimate,
            work_type=self.work_type,
            quantity=10,
            cost_price_per_unit=100.00,
            client_price_per_unit=150.00
        )

    def test_internal_export_access(self):
        """Test internal Excel export"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        response = self.client.get(f'/api/v1/estimates/{self.estimate.estimate_id}/export/internal/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    def test_client_export_access(self):
        """Test client Excel export"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        response = self.client.get(f'/api/v1/estimates/{self.estimate.estimate_id}/export/client/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    def test_export_nonexistent_estimate(self):
        """Test export of nonexistent estimate"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.manager_token.token}')
        
        response = self.client.get('/api/v1/estimates/999/export/internal/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)