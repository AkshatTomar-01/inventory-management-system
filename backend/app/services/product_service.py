from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
import math


class ProductService:
    def create(self, db: Session, payload: ProductCreate) -> Product:
        existing = db.query(Product).filter(Product.sku == payload.sku).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"success": False, "message": f"Product with SKU '{payload.sku}' already exists"},
            )
        product = Product(**payload.model_dump())
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    def get_all(
        self,
        db: Session,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> dict:
        query = db.query(Product).filter(Product.is_deleted == False)
        if search:
            query = query.filter(
                or_(
                    Product.name.ilike(f"%{search}%"),
                    Product.sku.ilike(f"%{search}%"),
                    Product.category.ilike(f"%{search}%"),
                )
            )
        total = query.count()
        sort_col = getattr(Product, sort_by, Product.created_at)
        if sort_order == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())
        items = query.offset((page - 1) * size).limit(size).all()
        return {"items": items, "total": total, "page": page, "size": size, "pages": math.ceil(total / size) if total else 0}

    def get_by_id(self, db: Session, product_id: UUID) -> Product:
        product = db.query(Product).filter(Product.id == product_id, Product.is_deleted == False).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "message": "Product not found"})
        return product

    def update(self, db: Session, product_id: UUID, payload: ProductUpdate) -> Product:
        product = self.get_by_id(db, product_id)
        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(product, field, value)
        db.commit()
        db.refresh(product)
        return product

    def delete(self, db: Session, product_id: UUID) -> dict:
        product = self.get_by_id(db, product_id)
        product.is_deleted = True
        db.commit()
        return {"success": True, "message": "Product deleted successfully"}

    def get_low_stock(self, db: Session, threshold: int = 10) -> list[Product]:
        return db.query(Product).filter(Product.is_deleted == False, Product.quantity_in_stock <= threshold).all()

    def get_inventory_value(self, db: Session) -> float:
        result = db.query(func.sum(Product.price * Product.quantity_in_stock)).filter(Product.is_deleted == False).scalar()
        return float(result or 0)


product_service = ProductService()
