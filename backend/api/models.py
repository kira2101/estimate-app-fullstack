
from django.db import models
import uuid

# Модели, основанные на BD.MD

class AuthToken(models.Model):
    token = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class Role(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.role_name

class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=255, unique=True)
    full_name = models.CharField(max_length=255)
    password_hash = models.CharField(max_length=255)
    role = models.ForeignKey(Role, on_delete=models.RESTRICT)

    def __str__(self):
        return self.full_name

    @property
    def is_authenticated(self):
        return True

class Client(models.Model):
    client_id = models.AutoField(primary_key=True)
    client_name = models.CharField(max_length=255)
    client_phone = models.CharField(max_length=50, blank=True, null=True)

class Project(models.Model):
    project_id = models.AutoField(primary_key=True)
    project_name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    client = models.ForeignKey(Client, on_delete=models.RESTRICT, blank=True, null=True)

class ProjectAssignment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user', 'project')

class WorkCategory(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=255, unique=True)

class WorkType(models.Model):
    work_type_id = models.AutoField(primary_key=True)
    category = models.ForeignKey(WorkCategory, on_delete=models.RESTRICT)
    work_name = models.CharField(max_length=255, unique=True)
    unit_of_measurement = models.CharField(max_length=20)

class WorkPrice(models.Model):
    price_id = models.AutoField(primary_key=True)
    work_type = models.OneToOneField(WorkType, on_delete=models.CASCADE)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    client_price = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

# НОВАЯ СУЩНОСТЬ ДЛЯ СТАТУСОВ
class Status(models.Model):
    status_id = models.AutoField(primary_key=True)
    status_name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.status_name

class Estimate(models.Model):
    estimate_id = models.AutoField(primary_key=True)
    estimate_number = models.CharField(max_length=50, blank=True, null=True)
    status = models.ForeignKey(Status, on_delete=models.RESTRICT, related_name='estimates')
    project = models.ForeignKey(Project, on_delete=models.RESTRICT)
    creator = models.ForeignKey(User, related_name='created_estimates', on_delete=models.RESTRICT)
    approver = models.ForeignKey(User, related_name='approved_estimates', on_delete=models.SET_NULL, blank=True, null=True)
    foreman = models.ForeignKey(User, related_name='managed_estimates', on_delete=models.SET_NULL, blank=True, null=True)
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class EstimateItem(models.Model):
    item_id = models.AutoField(primary_key=True)
    estimate = models.ForeignKey(Estimate, on_delete=models.CASCADE, related_name='items')
    work_type = models.ForeignKey(WorkType, on_delete=models.RESTRICT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    client_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)

class PriceChangeRequest(models.Model):
    request_id = models.AutoField(primary_key=True)
    estimate_item = models.ForeignKey(EstimateItem, on_delete=models.CASCADE)
    requester = models.ForeignKey(User, related_name='price_requests', on_delete=models.CASCADE)
    requested_price = models.DecimalField(max_digits=10, decimal_places=2)
    comment = models.TextField(blank=True, null=True)
    status = models.ForeignKey(Status, on_delete=models.RESTRICT, related_name='price_change_requests')
    reviewer = models.ForeignKey(User, related_name='reviewed_requests', on_delete=models.SET_NULL, blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)

# ... (остальные модели без изменений)
class MaterialCategory(models.Model):
    category_id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=255, unique=True)

class MaterialType(models.Model):
    material_type_id = models.AutoField(primary_key=True)
    category = models.ForeignKey(MaterialCategory, on_delete=models.RESTRICT)
    material_name = models.CharField(max_length=255, unique=True)
    unit_of_measurement = models.CharField(max_length=20)

class MaterialPrice(models.Model):
    price_id = models.AutoField(primary_key=True)
    material_type = models.OneToOneField(MaterialType, on_delete=models.CASCADE)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

class WorkMaterialRequirement(models.Model):
    work_type = models.ForeignKey(WorkType, on_delete=models.CASCADE)
    material_type = models.ForeignKey(MaterialType, on_delete=models.RESTRICT)
    consumption_rate = models.DecimalField(max_digits=10, decimal_places=3)

    class Meta:
        unique_together = ('work_type', 'material_type')

class EstimateMaterialItem(models.Model):
    item_material_id = models.AutoField(primary_key=True)
    estimate_item = models.ForeignKey(EstimateItem, on_delete=models.CASCADE)
    material_type = models.ForeignKey(MaterialType, on_delete=models.RESTRICT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
