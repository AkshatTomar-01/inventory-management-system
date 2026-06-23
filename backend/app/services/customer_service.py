from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
import math


class CustomerService:
    def create(self, db: Session, payload: CustomerCreate) -> Customer:
        existing = db.query(Customer).filter(Customer.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"success": False, "message": f"Customer with email '{payload.email}' already exists"},
            )
        customer = Customer(**payload.model_dump())
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    def get_all(
        self,
        db: Session,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
    ) -> dict:
        query = db.query(Customer).filter(Customer.is_deleted == False)
        if search:
            query = query.filter(
                or_(
                    Customer.full_name.ilike(f"%{search}%"),
                    Customer.email.ilike(f"%{search}%"),
                    Customer.phone.ilike(f"%{search}%"),
                )
            )
        total = query.count()
        items = query.order_by(Customer.created_at.desc()).offset((page - 1) * size).limit(size).all()
        return {"items": items, "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total else 0}

    def get_by_id(self, db: Session, customer_id: UUID) -> Customer:
        customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_deleted == False).first()
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "message": "Customer not found"})
        return customer

    def update(self, db: Session, customer_id: UUID, payload: CustomerUpdate) -> Customer:
        customer = self.get_by_id(db, customer_id)
        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(customer, field, value)
        db.commit()
        db.refresh(customer)
        return customer

    def delete(self, db: Session, customer_id: UUID) -> dict:
        customer = self.get_by_id(db, customer_id)
        customer.is_deleted = True
        db.commit()
        return {"success": True, "message": "Customer deleted successfully"}


customer_service = CustomerService()
