"""
Model tests for the estimate management system
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth.hashers import make_password
from decimal import Decimal

from api.models import (
    User, Role, AuthToken, Project, Estimate, WorkCategory, WorkType, 
    WorkPrice, EstimateItem, Status, ProjectAssignment, Client,
    PriceChangeRequest
)


class RoleModelTestCase(TestCase):
    """Tests for Role model"""
    
    def test_role_creation(self):
        """Test basic role creation"""
        role = Role.objects.create(role_name='тестовая роль')
        self.assertEqual(role.role_name, 'тестовая роль')
        self.assertEqual(str(role), 'тестовая роль')

    def test_role_uniqueness(self):
        """Test that role names must be unique"""
        Role.objects.create(role_name='менеджер')
        
        with self.assertRaises(IntegrityError):
            Role.objects.create(role_name='менеджер')


class UserModelTestCase(TestCase):
    """Tests for User model"""
    
    def setUp(self):
        self.manager_role = Role.objects.create(role_name='менеджер')
        self.foreman_role = Role.objects.create(role_name='прораб')

    def test_user_creation(self):
        """Test basic user creation"""
        user = User.objects.create(
            email='test@example.com',
            full_name='Test User',
            password_hash=make_password('testpass'),
            role=self.manager_role
        )
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.full_name, 'Test User')
        self.assertEqual(user.role, self.manager_role)
        self.assertTrue(user.is_authenticated)
        self.assertEqual(str(user), 'Test User')

    def test_email_uniqueness(self):
        """Test that emails must be unique"""
        User.objects.create(
            email='test@example.com',
            full_name='Test User 1',
            password_hash=make_password('testpass'),
            role=self.manager_role
        )
        
        with self.assertRaises(IntegrityError):
            User.objects.create(
                email='test@example.com',
                full_name='Test User 2',
                password_hash=make_password('testpass'),
                role=self.foreman_role
            )

    def test_role_foreign_key_constraint(self):
        """Test that user creation fails without valid role"""
        with self.assertRaises(IntegrityError):
            User.objects.create(
                email='test@example.com',
                full_name='Test User',
                password_hash=make_password('testpass'),
                role_id=999  # Non-existent role
            )


class AuthTokenModelTestCase(TestCase):
    """Tests for AuthToken model"""
    
    def setUp(self):
        self.role = Role.objects.create(role_name='тестер')
        self.user = User.objects.create(
            email='test@example.com',
            full_name='Test User',
            password_hash=make_password('testpass'),
            role=self.role
        )

    def test_token_creation(self):
        """Test auth token creation"""
        token = AuthToken.objects.create(user=self.user)
        
        self.assertIsNotNone(token.token)
        self.assertEqual(token.user, self.user)
        self.assertIsNotNone(token.created_at)

    def test_one_to_one_relationship(self):
        """Test that user can have only one token"""
        AuthToken.objects.create(user=self.user)
        
        with self.assertRaises(IntegrityError):
            AuthToken.objects.create(user=self.user)


class WorkCategoryModelTestCase(TestCase):
    """Tests for WorkCategory model"""
    
    def test_category_creation(self):
        """Test work category creation"""
        category = WorkCategory.objects.create(category_name='Тестовая категория')
        
        self.assertEqual(category.category_name, 'Тестовая категория')

    def test_category_name_uniqueness(self):
        """Test that category names must be unique"""
        WorkCategory.objects.create(category_name='Уникальная категория')
        
        with self.assertRaises(IntegrityError):
            WorkCategory.objects.create(category_name='Уникальная категория')


class WorkTypeModelTestCase(TestCase):
    """Tests for WorkType model"""
    
    def setUp(self):
        self.category = WorkCategory.objects.create(category_name='Тестовая категория')

    def test_work_type_creation(self):
        """Test work type creation"""
        work_type = WorkType.objects.create(
            category=self.category,
            work_name='Тестовая работа',
            unit_of_measurement='м²',
            usage_count=0
        )
        
        self.assertEqual(work_type.work_name, 'Тестовая работа')
        self.assertEqual(work_type.unit_of_measurement, 'м²')
        self.assertEqual(work_type.usage_count, 0)
        self.assertEqual(work_type.category, self.category)

    def test_work_name_uniqueness(self):
        """Test that work names must be unique"""
        WorkType.objects.create(
            category=self.category,
            work_name='Уникальная работа',
            unit_of_measurement='шт'
        )
        
        with self.assertRaises(IntegrityError):
            WorkType.objects.create(
                category=self.category,
                work_name='Уникальная работа',
                unit_of_measurement='кг'
            )

    def test_usage_count_default(self):
        """Test that usage_count defaults to 0"""
        work_type = WorkType.objects.create(
            category=self.category,
            work_name='Тестовая работа',
            unit_of_measurement='м²'
        )
        
        self.assertEqual(work_type.usage_count, 0)


class WorkPriceModelTestCase(TestCase):
    """Tests for WorkPrice model"""
    
    def setUp(self):
        self.category = WorkCategory.objects.create(category_name='Тестовая категория')
        self.work_type = WorkType.objects.create(
            category=self.category,
            work_name='Тестовая работа',
            unit_of_measurement='м²'
        )

    def test_work_price_creation(self):
        """Test work price creation"""
        work_price = WorkPrice.objects.create(
            work_type=self.work_type,
            cost_price=Decimal('100.50'),
            client_price=Decimal('150.75')
        )
        
        self.assertEqual(work_price.work_type, self.work_type)
        self.assertEqual(work_price.cost_price, Decimal('100.50'))
        self.assertEqual(work_price.client_price, Decimal('150.75'))
        self.assertIsNotNone(work_price.updated_at)

    def test_one_to_one_relationship(self):
        """Test that work type can have only one price"""
        WorkPrice.objects.create(
            work_type=self.work_type,
            cost_price=Decimal('100.00'),
            client_price=Decimal('150.00')
        )
        
        with self.assertRaises(IntegrityError):
            WorkPrice.objects.create(
                work_type=self.work_type,
                cost_price=Decimal('200.00'),
                client_price=Decimal('250.00')
            )


class ProjectModelTestCase(TestCase):
    """Tests for Project model"""
    
    def setUp(self):
        self.client = Client.objects.create(client_name='Тестовый клиент')

    def test_project_creation(self):
        """Test project creation"""
        project = Project.objects.create(
            project_name='Тестовый проект',
            address='Тестовый адрес',
            client=self.client
        )
        
        self.assertEqual(project.project_name, 'Тестовый проект')
        self.assertEqual(project.address, 'Тестовый адрес')
        self.assertEqual(project.client, self.client)

    def test_project_without_client(self):
        """Test project creation without client"""
        project = Project.objects.create(
            project_name='Проект без клиента',
            address='Адрес'
        )
        
        self.assertIsNone(project.client)


class EstimateModelTestCase(TestCase):
    """Tests for Estimate model"""
    
    def setUp(self):
        self.role = Role.objects.create(role_name='менеджер')
        self.user = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass'),
            role=self.role
        )
        
        self.project = Project.objects.create(
            project_name='Тестовый проект',
            address='Тестовый адрес'
        )
        
        self.status = Status.objects.create(status_name='Черновик')

    def test_estimate_creation(self):
        """Test estimate creation"""
        estimate = Estimate.objects.create(
            estimate_number='TEST-001',
            status=self.status,
            project=self.project,
            creator=self.user,
            foreman=self.user
        )
        
        self.assertEqual(estimate.estimate_number, 'TEST-001')
        self.assertEqual(estimate.status, self.status)
        self.assertEqual(estimate.project, self.project)
        self.assertEqual(estimate.creator, self.user)
        self.assertEqual(estimate.foreman, self.user)
        self.assertIsNotNone(estimate.created_at)

    def test_estimate_without_number(self):
        """Test estimate creation without number"""
        estimate = Estimate.objects.create(
            status=self.status,
            project=self.project,
            creator=self.user,
            foreman=self.user
        )
        
        self.assertIsNone(estimate.estimate_number)


class EstimateItemModelTestCase(TestCase):
    """Tests for EstimateItem model"""
    
    def setUp(self):
        # Create required objects
        self.role = Role.objects.create(role_name='менеджер')
        self.user = User.objects.create(
            email='manager@test.com',
            full_name='Test Manager',
            password_hash=make_password('testpass'),
            role=self.role
        )
        
        self.project = Project.objects.create(project_name='Тестовый проект')
        self.status = Status.objects.create(status_name='Черновик')
        
        self.estimate = Estimate.objects.create(
            estimate_number='TEST-001',
            status=self.status,
            project=self.project,
            creator=self.user,
            foreman=self.user
        )
        
        self.category = WorkCategory.objects.create(category_name='Тестовая категория')
        self.work_type = WorkType.objects.create(
            category=self.category,
            work_name='Тестовая работа',
            unit_of_measurement='м²'
        )

    def test_estimate_item_creation(self):
        """Test estimate item creation"""
        item = EstimateItem.objects.create(
            estimate=self.estimate,
            work_type=self.work_type,
            quantity=Decimal('10.5'),
            cost_price_per_unit=Decimal('100.00'),
            client_price_per_unit=Decimal('150.00')
        )
        
        self.assertEqual(item.estimate, self.estimate)
        self.assertEqual(item.work_type, self.work_type)
        self.assertEqual(item.quantity, Decimal('10.5'))
        self.assertEqual(item.cost_price_per_unit, Decimal('100.00'))
        self.assertEqual(item.client_price_per_unit, Decimal('150.00'))

    def test_estimate_item_relationships(self):
        """Test that estimate item has correct relationships"""
        item = EstimateItem.objects.create(
            estimate=self.estimate,
            work_type=self.work_type,
            quantity=Decimal('5.0'),
            cost_price_per_unit=Decimal('100.00'),
            client_price_per_unit=Decimal('150.00')
        )
        
        # Test reverse relationship
        self.assertIn(item, self.estimate.items.all())


class ProjectAssignmentModelTestCase(TestCase):
    """Tests for ProjectAssignment model"""
    
    def setUp(self):
        self.role = Role.objects.create(role_name='прораб')
        self.user = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass'),
            role=self.role
        )
        
        self.project = Project.objects.create(project_name='Тестовый проект')

    def test_project_assignment_creation(self):
        """Test project assignment creation"""
        assignment = ProjectAssignment.objects.create(
            user=self.user,
            project=self.project
        )
        
        self.assertEqual(assignment.user, self.user)
        self.assertEqual(assignment.project, self.project)

    def test_unique_together_constraint(self):
        """Test that user-project combination must be unique"""
        ProjectAssignment.objects.create(
            user=self.user,
            project=self.project
        )
        
        with self.assertRaises(IntegrityError):
            ProjectAssignment.objects.create(
                user=self.user,
                project=self.project
            )


class PriceChangeRequestModelTestCase(TestCase):
    """Tests for PriceChangeRequest model"""
    
    def setUp(self):
        # Create required objects
        self.role = Role.objects.create(role_name='прораб')
        self.user = User.objects.create(
            email='foreman@test.com',
            full_name='Test Foreman',
            password_hash=make_password('testpass'),
            role=self.role
        )
        
        self.project = Project.objects.create(project_name='Тестовый проект')
        self.status = Status.objects.create(status_name='Черновик')
        self.pending_status = Status.objects.create(status_name='На рассмотрении')
        
        self.estimate = Estimate.objects.create(
            estimate_number='TEST-001',
            status=self.status,
            project=self.project,
            creator=self.user,
            foreman=self.user
        )
        
        self.category = WorkCategory.objects.create(category_name='Тестовая категория')
        self.work_type = WorkType.objects.create(
            category=self.category,
            work_name='Тестовая работа',
            unit_of_measurement='м²'
        )
        
        self.estimate_item = EstimateItem.objects.create(
            estimate=self.estimate,
            work_type=self.work_type,
            quantity=Decimal('10.0'),
            cost_price_per_unit=Decimal('100.00'),
            client_price_per_unit=Decimal('150.00')
        )

    def test_price_change_request_creation(self):
        """Test price change request creation"""
        request = PriceChangeRequest.objects.create(
            estimate_item=self.estimate_item,
            requester=self.user,
            requested_price=Decimal('120.00'),
            comment='Increased material costs',
            status=self.pending_status
        )
        
        self.assertEqual(request.estimate_item, self.estimate_item)
        self.assertEqual(request.requester, self.user)
        self.assertEqual(request.requested_price, Decimal('120.00'))
        self.assertEqual(request.comment, 'Increased material costs')
        self.assertEqual(request.status, self.pending_status)
        self.assertIsNone(request.reviewer)
        self.assertIsNone(request.reviewed_at)