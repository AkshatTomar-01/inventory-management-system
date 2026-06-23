from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.base import get_db
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order, OrderStatus
from app.schemas.common import DashboardStats
from app.services.product_service import product_service
from app.services.order_service import order_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_products = db.query(Product).filter(Product.is_deleted == False).count()
    total_customers = db.query(Customer).filter(Customer.is_deleted == False).count()
    total_orders = db.query(Order).count()
    low_stock = len(product_service.get_low_stock(db, threshold=10))
    inventory_value = product_service.get_inventory_value(db)
    pending = db.query(Order).filter(Order.status == OrderStatus.PENDING).count()
    completed = db.query(Order).filter(Order.status == OrderStatus.COMPLETED).count()
    cancelled = db.query(Order).filter(Order.status == OrderStatus.CANCELLED).count()

    return DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_products=low_stock,
        inventory_value=inventory_value,
        pending_orders=pending,
        completed_orders=completed,
        cancelled_orders=cancelled,
    )


@router.get("/charts/orders")
def get_order_chart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return order_service.get_monthly_stats(db)


@router.get("/charts/inventory")
def get_inventory_chart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = db.query(
        Product.category,
        func.sum(Product.quantity_in_stock).label("total_stock"),
        func.count(Product.id).label("count"),
    ).filter(Product.is_deleted == False).group_by(Product.category).all()
    return [{"category": r.category or "Uncategorized", "total_stock": int(r.total_stock or 0), "count": r.count} for r in products]
